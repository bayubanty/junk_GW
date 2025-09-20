document.addEventListener('DOMContentLoaded', function() {
    let hospitalsData = [];
    let filteredHospitals = [];
    let currentMetric = '';
    let activeDropdown = null;
    let mainMap = null;
    let markers = [];
    let locationCircle = null;
    let markerLayerGroup = L.layerGroup();

    // Load hospital data from JSON file
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            hospitalsData = data;
            filteredHospitals = [...hospitalsData];
            
            // Display hospitals
            displayHospitals(filteredHospitals);
            
            // Initialize the map
            initMainMap();
            
            // Add event listeners
            setupEventListeners();
        })
        .catch(error => {
            console.error('Error loading hospital data:', error);
            showToast("Error loading hospital data. Please try again later.");
        });

    function setupEventListeners() {
        // Add toggle functionality to all dropdowns (including hospital type)
        const dropdownHeaders = document.querySelectorAll('.dropdown-header');
        dropdownHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const content = this.nextElementSibling;
                const isActive = this.classList.contains('active');
                
                // Close all dropdowns
                document.querySelectorAll('.dropdown-content').forEach(item => {
                    item.classList.remove('show');
                });
                document.querySelectorAll('.dropdown-header').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Open this dropdown if it wasn't active
                if (!isActive) {
                    content.classList.add('show');
                    this.classList.add('active');
                }
            });
        });

        // Add change event to hospital type checkboxes
        const hospitalTypeCheckboxes = document.querySelectorAll('input[name="hospitalType"]');
        hospitalTypeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                // If "All" is checked, uncheck others
                if (this.value === '' && this.checked) {
                    hospitalTypeCheckboxes.forEach(cb => {
                        if (cb !== this) cb.checked = false;
                    });
                } 
                // If any other is checked, uncheck "All"
                else if (this.checked) {
                    document.querySelector('input[name="hospitalType"][value=""]').checked = false;
                }
                
                // If nothing is checked, check "All"
                const anyChecked = Array.from(hospitalTypeCheckboxes).some(cb => cb.checked);
                if (!anyChecked) {
                    document.querySelector('input[name="hospitalType"][value=""]').checked = true;
                }
            });
        });

        // Apply filters button
        document.getElementById('sidebarSearchBtn').addEventListener('click', function() {
            applyAllFilters();
        });

        // Location search button
        document.getElementById('locationSearchBtn').addEventListener('click', function() {
            searchByLocation();
        });

        // Reset filters button
        document.getElementById('sidebarResetBtn').addEventListener('click', function() {
            resetAllFilters();
        });

        // Download button
        document.getElementById('downloadBtn').addEventListener('click', function() {
            downloadResults();
        });

        // Add click event to details buttons (using event delegation)
        document.getElementById('hospitalResults').addEventListener('click', function(e) {
            if (e.target.classList.contains('details-button')) {
                const hospitalId = e.target.getAttribute('data-id');
                const hospital = hospitalsData.find(h => h.RECORD_ID == hospitalId);
                const row = e.target.closest('tr');
                const detailsRow = row.nextElementSibling;
                
                // If this dropdown is already open, close it
                if (activeDropdown === detailsRow) {
                    detailsRow.style.display = 'none';
                    activeDropdown = null;
                    e.target.textContent = 'View Details';
                    return;
                }
                
                // Close any open dropdown
                if (activeDropdown) {
                    activeDropdown.style.display = 'none';
                    activeDropdown.previousElementSibling.querySelector('.details-button').textContent = 'View Details';
                }
                
                // If this row doesn't have a details row, create one
                if (!detailsRow || !detailsRow.classList.contains('hospital-details-dropdown')) {
                    const newRow = document.createElement('tr');
                    newRow.classList.add('hospital-details-dropdown');
                    newRow.innerHTML = `<td colspan="3"><div class="details-content"></div></td>`;
                    row.parentNode.insertBefore(newRow, row.nextSibling);
                    showHospitalDetails(hospital, newRow.querySelector('.details-content'));
                    activeDropdown = newRow;
                } else {
                    detailsRow.style.display = 'table-row';
                    activeDropdown = detailsRow;
                }
                
                e.target.textContent = 'Hide Details';
            }
        });
    }

    function showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    function searchByLocation() {
        const zipCode = document.getElementById('zipCodeInput').value.trim();
        const radius = document.getElementById('radiusSelect').value;
        
        if (!zipCode || !radius) {
            showToast("Please enter a ZIP code and select a radius");
            return;
        }
        
        // Show loading indicator
        document.getElementById('resultsLoading').style.display = 'block';
        
        // Simulate API call with timeout
        setTimeout(() => {
            // In a real application, you would geocode the ZIP code to get coordinates
            // For this demo, we'll use a random central point in Georgia
            const centerLat = 33.7490;
            const centerLng = -84.3880;
            
            // Convert radius from miles to approximate degrees (rough conversion)
            const radiusInDegrees = radius / 69;
            
            // Clear previous location circle
            if (locationCircle) {
                mainMap.removeLayer(locationCircle);
            }
            
            // Add circle to map showing search area
            locationCircle = L.circle([centerLat, centerLng], {
                color: '#6fb353',
                fillColor: '#6fb353',
                fillOpacity: 0.2,
                radius: radius * 1609.34 // Convert miles to meters
            }).addTo(mainMap);
            
            // Filter hospitals by proximity to the center point
            filteredHospitals = hospitalsData.filter(hospital => {
                // Calculate distance using simple Euclidean distance (for demo purposes)
                // In a real app, you would use Haversine formula for accurate distance
                const latDiff = hospital.Lat - centerLat;
                const lngDiff = hospital.Lng - centerLng;
                const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69; // Approx miles
                
                return distance <= radius;
            });
            
            displayHospitals(filteredHospitals);
            updateMapMarkers(filteredHospitals);
            
            // Center map on the search location
            mainMap.setView([centerLat, centerLng], 9);
            
            // Hide loading indicator
            document.getElementById('resultsLoading').style.display = 'none';
            
            showToast(`Found ${filteredHospitals.length} hospitals within ${radius} miles`);
        }, 800);
    }

    function applyAllFilters() {
        // Show loading indicator
        document.getElementById('resultsLoading').style.display = 'block';
        
        setTimeout(() => {
            // Get selected hospital types from checkboxes
            const typeCheckboxes = document.querySelectorAll('input[name="hospitalType"]:checked');
            const selectedTypes = Array.from(typeCheckboxes).map
