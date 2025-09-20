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
            const selectedTypes = Array.from(typeCheckboxes).map(cb => cb.value);
            
            // If "All Hospital Types" is selected or no specific types are selected, show all
            const showAllTypes = selectedTypes.includes('') || selectedTypes.length === 0;
            
            // Get selected metrics from dropdowns
            const metricFilters = getSelectedMetrics();
            
            filteredHospitals = hospitalsData.filter(hospital => {
                // Type matching logic
                let typeMatch = showAllTypes;
                
                if (!showAllTypes) {
                    typeMatch = selectedTypes.some(type => {
                        switch(type) {
                            case 'rural': return hospital.TYPE_rural === 1;
                            case 'urban': return hospital.TYPE_urban === 1;
                            case 'nonprofit': return hospital.TYPE_NonProfit === 1;
                            case 'forprofit': return hospital.TYPE_ForProfit === 1;
                            default: return false;
                        }
                    });
                }
                
                // Apply metric filters if any are selected
                let metricMatch = true;
                if (metricFilters.length > 0) {
                    // Check if hospital meets any of the selected metric criteria
                    metricMatch = metricFilters.some(metric => {
                        // For demo purposes, we'll assume hospitals with scores above 70 meet the criteria
                        const metricValue = hospital[metric.id.replace('f', '')];
                        return metricValue !== undefined && metricValue > 70;
                    });
                }
                
                return typeMatch && metricMatch;
            });

            displayHospitals(filteredHospitals);
            updateMapMarkers(filteredHospitals);
            
            // Hide loading indicator
            document.getElementById('resultsLoading').style.display = 'none';
            
            showToast(`Applied filters to ${filteredHospitals.length} hospitals`);
        }, 500);
    }

    function getSelectedMetrics() {
        const selectedMetrics = [];
        
        // Get all checked metric checkboxes
        const checkedBoxes = document.querySelectorAll('.dropdown-content input[type="checkbox"]:checked');
        
        checkedBoxes.forEach(checkbox => {
            selectedMetrics.push({
                category: checkbox.getAttribute('data-category'),
                id: checkbox.id
            });
        });
        
        return selectedMetrics;
    }

    function resetAllFilters() {
        // Reset hospital type checkboxes
        document.querySelectorAll('input[name="hospitalType"]').forEach(cb => {
            cb.checked = false;
        });
        document.querySelector('input[name="hospitalType"][value=""]').checked = true;
        
        // Reset location search
        document.getElementById('zipCodeInput').value = '';
        document.getElementById('radiusSelect').value = '';
        
        // Remove location circle from map
        if (locationCircle) {
            mainMap.removeLayer(locationCircle);
            locationCircle = null;
        }
        
        // Reset metric checkboxes
        document.querySelectorAll('.dropdown-content input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        
        // Close all dropdowns
        document.querySelectorAll('.dropdown-content').forEach(item => {
            item.classList.remove('show');
        });
        document.querySelectorAll('.dropdown-header').forEach(item => {
            item.classList.remove('active');
        });
        
        // Reset to show all hospitals
        filteredHospitals = [...hospitalsData];
        displayHospitals(filteredHospitals);
        
        // Update map with all hospitals
        updateMapMarkers(filteredHospitals);
        
        // Reset map view
        mainMap.setView([32.6782, -83.2226], 7);
        
        showToast("All filters have been reset");
    }

    function downloadResults() {
        // Create CSV content
        let csvContent = "Name,City,Type,Grade\n";
        
        filteredHospitals.forEach(hospital => {
            const type = hospital.TYPE_NonProfit ? "Nonprofit" : "For Profit";
            const location = hospital.TYPE_urban ? "Urban" : "Rural";
            csvContent += `"${hospital.Name}",${hospital.City},${type} (${location}),${hospital.TIER_1_GRADE_Lown_Composite}\n`;
        });
        
        // Create download link
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "georgia_hospitals_filtered.csv");
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        
        showToast("Download started");
    }

    function displayHospitals(hospitals) {
        const resultsContainer = document.getElementById('hospitalResults');
        const resultsCount = document.getElementById('resultsCount');
        
        resultsCount.textContent = `Viewing ${hospitals.length} results`;
        
        let html = '';
        
        if (hospitals.length === 0) {
            html = `<tr><td colspan="3" style="text-align: center; padding: 30px;">No hospitals match your search criteria</td></tr>`;
        } else {
            hospitals.forEach((hospital) => {
                // Determine grade class for color coding
                const gradeClass = `grade-${hospital.TIER_1_GRADE_Lown_Composite}`;
                
                html += `
                <tr>
                    <td><span class="grade-circle ${gradeClass}">${hospital.TIER_1_GRADE_Lown_Composite}</span></td>
                    <td>
                        <a href="?id=${hospital.RECORD_ID}" class="hospital-link">${hospital.Name}</a><br>
                        ${hospital.Address}, ${hospital.City}, ${hospital.State} ${hospital.Zip}
                    </td>
                    <td><button class="details-button" data-id="${hospital.RECORD_ID}">View Details</button></td>
                </tr>
                `;
            });
        }
        
        resultsContainer.innerHTML = html;
        
        // Clear any active dropdown when results change
        if (activeDropdown) {
            activeDropdown.style.display = 'none';
            activeDropdown = null;
        }
    }

    function showHospitalDetails(hospital, container) {
        // Determine grade class for color coding
        const gradeClass = `grade-${hospital.TIER_1_GRADE_Lown_Composite}`;
        
        // Set hospital details
        container.innerHTML = `
        <div class="details-grid">
            <div class="details-section">
                <h4>Hospital Information</h4>
                <p><strong>Grade:</strong> <span class="grade-circle ${gradeClass}">${hospital.TIER_1_GRADE_Lown_Composite}</span></p>
                <p><strong>Type:</strong> ${hospital.TYPE_NonProfit ? 'Nonprofit' : 'For Profit'}</p>
                <p><strong>Location:</strong> ${hospital.TYPE_urban ? 'Urban' : 'Rural'}</p>
            </div>
            <div class="details-section">
                <h4>Location Details</h4>
                <p><strong>Address:</strong> ${hospital.Address}</p>
                <p><strong>City:</strong> ${hospital.City}</p>
                <p><strong>State:</strong> ${hospital.State}</p>
                <p><strong>ZIP:</strong> ${hospital.Zip}</p>
            </div>
        </div>
        <div class="metric-bars">
            <h4>Performance Metrics</h4>
            <div class="metric-bar">
                <div class="metric-name">
                    <span>Balance Growth</span>
                    <span class="metric-value">${hospital.BalanceGrowth}%</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${hospital.BalanceGrowth}%"></div>
                </div>
            </div>
            <div class="metric-bar">
                <div class="metric-name">
                    <span>Transparency</span>
                    <span class="metric-value">${hospital.Transparency}%</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${hospital.Transparency}%"></div>
                </div>
            </div>
            <div class="metric-bar">
                <div class="metric-name">
                    <span>Charity Care</span>
                    <span class="metric-value">${hospital.CharityCare}%</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${hospital.CharityCare}%"></div>
                </div>
            </div>
        </div>
        <div style="text-align: center; margin-top: 15px;">
            <a href="?id=${hospital.RECORD_ID}" class="details-button">View Full Details Page</a>
        </div>
        `;
    }

    function initMainMap() {
        // Create a map centered on Georgia
        mainMap = L.map('mainMap').setView([32.6782, -83.2226], 7);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mainMap);
        
        // Add marker layer group to map
        markerLayerGroup.addTo(mainMap);
        
        // Add markers for all hospitals
        updateMapMarkers(filteredHospitals);
    }

    function updateMapMarkers(hospitals) {
        // Clear existing markers
        markerLayerGroup.clearLayers();
        markers = [];
        
        // Add new markers for each hospital
        hospitals.forEach(hospital => {
            // Determine marker color based on grade
            let markerColor;
            switch(hospital.TIER_1_GRADE_Lown_Composite) {
                case 'A': markerColor = '#2ecc71'; break;
                case 'B': markerColor = '#57d68d'; break;
                case 'C': markerColor = '#ffe135'; break;
                case 'D': markerColor = '#ffd700'; break;
                case 'F': markerColor = '#e74c3c'; break;
                default: markerColor = '#0078c8';
            }
            
            // Create a custom icon
            const hospitalIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${markerColor}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${hospital.TIER_1_GRADE_Lown_Composite}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            
            // Add marker to map
            const marker = L.marker([hospital.Lat, hospital.Lng], {icon: hospitalIcon})
                .addTo(markerLayerGroup)
                .bindPopup(`
                    <b>${hospital.Name</b><br>
                    ${hospital.Address}, ${hospital.City}<br>
                    Grade: ${hospital.TIER_1_GRADE_Lown_Composite}
                `);
            
            markers.push(marker);
        });
        
        // Adjust map view to show all markers if there are any
        if (hospitals.length > 0) {
            const group = new L.featureGroup(markers);
            mainMap.fitBounds(group.getBounds().pad(0.1));
        }
    }
});
