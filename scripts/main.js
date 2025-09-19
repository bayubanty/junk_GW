/* scripts/main.js */

document.addEventListener('DOMContentLoaded', function() {
    let hospitalsData = [];
    let filteredHospitals = [];
    let currentMetric = '';
    let activeDropdown = null;
    let mainMap = null;
    let markers = [];

    // Load hospital data from JSON file
    fetch('data/hospitals.json')
        .then(response => response.json())
        .then(data => {
            hospitalsData = data;
            filteredHospitals = [...hospitalsData];
            
            // Populate city dropdown
            populateCityDropdown();
            
            // Display hospitals
            displayHospitals(filteredHospitals);
            
            // Initialize the map
            initMainMap();

            // Add event listeners
            setupEventListeners();
        })
        .catch(error => {
            console.error('Error loading hospital data:', error);
        });

    function setupEventListeners() {
        // Add click event to metrics
        const metrics = document.querySelectorAll('.metrics-list li');
        metrics.forEach(metric => {
            metric.addEventListener('click', function() {
                const metricType = this.getAttribute('data-metric');
                
                // Toggle active class
                metrics.forEach(m => m.classList.remove('active'));
                this.classList.add('active');
                
                // Sort by selected metric
                sortHospitalsByMetric(metricType);
                currentMetric = metricType;
            });
        });


        // Add toggle functionality to metric dropdowns start
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

// Apply metric filters button
document.getElementById('applyMetricsBtn').addEventListener('click', function() {
    const selectedMetrics = [];
    
    // Get all checked checkboxes
    const checkedBoxes = document.querySelectorAll('.dropdown-content input[type="checkbox"]:checked');
    
    checkedBoxes.forEach(checkbox => {
        selectedMetrics.push({
            category: checkbox.getAttribute('data-category'),
            id: checkbox.id
        });
    });
    
    // Apply the filters (you'll need to implement this function)
    applyMetricFilters(selectedMetrics);
});

// Function to apply metric filters (to be implemented based on your data structure)
function applyMetricFilters(metrics) {
    console.log("Applying metric filters:", metrics);
    // Your implementation here based on how you want to filter the hospitals
    // This will depend on your data structure and what each metric represents
}

        
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
        
        // Sidebar search button
        document.getElementById('sidebarSearchBtn').addEventListener('click', function() {
            filterHospitals();
        });
        
        // Sidebar reset button
        document.getElementById('sidebarResetBtn').addEventListener('click', function() {
            // Clear all sidebar inputs
            document.getElementById('sidebarHospitalType').value = '';
            document.getElementById('sidebarCity').value = '';
            
            // Reset to show all hospitals
            filteredHospitals = [...hospitalsData];
            displayHospitals(filteredHospitals);
            
            // Update map with all hospitals
            updateMapMarkers(filteredHospitals);
            
            // Remove active class from metrics
            const metrics = document.querySelectorAll('.metrics-list li');
            metrics.forEach(m => m.classList.remove('active'));
            currentMetric = '';
        });
    }

    function populateCityDropdown() {
        const cityDropdown = document.getElementById('sidebarCity');
        const cities = new Set();
        
        // Extract all unique cities from hospital data
        hospitalsData.forEach(hospital => {
            if (hospital.City) {
                cities.add(hospital.City);
            }
        });
        
        // Sort cities alphabetically
        const sortedCities = Array.from(cities).sort();
        
        // Add cities to dropdown
        sortedCities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            cityDropdown.appendChild(option);
        });
    }

    function displayHospitals(hospitals) {
        const resultsContainer = document.getElementById('hospitalResults');
        const resultsCount = document.getElementById('resultsCount');
        
        resultsCount.textContent = `Viewing ${hospitals.length} results`;
        
        let html = '';
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
        
        resultsContainer.innerHTML = html;
        
        // Clear any active dropdown when results change
        if (activeDropdown) {
            activeDropdown.style.display = 'none';
            activeDropdown = null;
        }
    }
    
    function filterHospitals() {
        const typeFilter = document.getElementById('sidebarHospitalType').value;
        const cityFilter = document.getElementById('sidebarCity').value;
        
        filteredHospitals = hospitalsData.filter(hospital => {
            const typeMatch = !typeFilter || 
                (typeFilter === 'rural' && hospital.TYPE_rural === 1) ||
                (typeFilter === 'urban' && hospital.TYPE_urban === 1) ||
                (typeFilter === 'nonprofit' && hospital.TYPE_NonProfit === 1) ||
                (typeFilter === 'forprofit' && hospital.TYPE_ForProfit === 1);
            
            const cityMatch = !cityFilter || hospital.City === cityFilter;
            
            return typeMatch && cityMatch;
        });
        
        // Reapply metric sorting if one is selected
        if (currentMetric) {
            sortHospitalsByMetric(currentMetric);
        } else {
            displayHospitals(filteredHospitals);
        }
        
        // Update map with filtered hospitals
        updateMapMarkers(filteredHospitals);
    }
    
    function sortHospitalsByMetric(metric) {
        // This is a simplified version - in a real implementation, you would
        // map the metric to actual data fields in the JSON
        filteredHospitals.sort((a, b) => {
            // For demonstration purposes, we'll sort by hospital name
            return a.Name.localeCompare(b.Name);
        });
        
        displayHospitals(filteredHospitals);
        updateMapMarkers(filteredHospitals);
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
                    <p><strong>Size:</strong> ${hospital.Size}</p>
                    <p><strong>Type:</strong> ${hospital.TYPE_NonProfit ? 'Nonprofit' : 'For Profit'}</p>
                    <p><strong>Location:</strong> ${hospital.TYPE_urban ? 'Urban' : 'Rural'}</p>
                    <p><strong>County Income:</strong> ${hospital.county_income_shrt || 'N/A'}</p>
                </div>
                
                <div class="details-section">
                    <h4>Key Metrics</h4>
                    <p><strong>Outcome Grade:</strong> ${hospital.TIER_2_GRADE_Outcome}</p>
                    <p><strong>Value Grade:</strong> ${hospital.TIER_2_GRADE_Value}</p>
                    <p><strong>Civic Grade:</strong> ${hospital.TIER_2_GRADE_Civic}</p>
                    <p><strong>Patient Safety Grade:</strong> ${hospital.TIER_3_GRADE_Pat_Saf}</p>
                    <p><strong>Patient Experience Grade:</strong> ${hospital.TIER_3_GRADE_Pat_Exp}</p>
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
        
        // Add markers for all hospitals
        updateMapMarkers(filteredHospitals);
    }
    
    function updateMapMarkers(hospitals) {
        // Clear existing markers
        markers.forEach(marker => mainMap.removeLayer(marker));
        markers = [];
        
        // Add new markers for each hospital
        hospitals.forEach(hospital => {
            // Generate a simple lat/lng based on city (in a real app, you'd use actual coordinates)
            const lat = 32.6782 + (Math.random() - 0.5) * 2;
            const lng = -83.2226 + (Math.random() - 0.5) * 2;
            
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
            const marker = L.marker([lat, lng], {icon: hospitalIcon})
                .addTo(mainMap)
                .bindPopup(`
                    <b>${hospital.Name}</b><br>
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
    
    function showHospitalDetailPage(hospitalId) {
        // Hide the main content and show detail content
        document.querySelector('.main-content').style.display = 'none';
        document.querySelector('.map-section').style.display = 'none';
        
        const hospital = hospitalsData.find(h => h.RECORD_ID == hospitalId);
        
        if (!hospital) {
            // Hospital not found, redirect to main page
            window.location.href = window.location.pathname;
            return;
        }
        
        // Create detail page content
        const detailContainer = document.createElement('div');
        detailContainer.className = 'hospital-detail-container';
        
        // Determine grade class for color coding
        const gradeClass = `grade-${hospital.TIER_1_GRADE_Lown_Composite}`;
        
        // Generate a simple lat/lng based on city (in a real app, you'd use actual coordinates)
        const lat = 32.6782 + (Math.random() - 0.5) * 2;
        const lng = -83.2226 + (Math.random() - 0.5) * 2;
        
        detailContainer.innerHTML = `
            <div class="hospital-header">
                <div>
                    <h2>${hospital.Name}</h2>
                    <p>${hospital.Address}, ${hospital.City}, ${hospital.State} ${hospital.Zip}</p>
                </div>
                <a href="${window.location.pathname}" class="back-button">Back to Results</a>
            </div>
            
            <div class="detail-page-grid">
                <div class="detail-page-section">
                    <h3>Hospital Information</h3>
                    <p><strong>Grade:</strong> <span class="grade-circle ${gradeClass}">${hospital.TIER_1_GRADE_Lown_Composite}</span></p>
                    <p><strong>Size:</strong> ${hospital.Size}</p>
                    <p><strong>Type:</strong> ${hospital.TYPE_NonProfit ? 'Nonprofit' : 'For Profit'}</p>
                    <p><strong>Location:</strong> ${hospital.TYPE_urban ? 'Urban' : 'Rural'}</p>
                    <p><strong>County Income:</strong> ${hospital.county_income_shrt || 'N/A'}</p>
                    <p><strong>Financial Assistance:</strong> ${hospital.avpb_freecare || 'Unknown'}</p>
                </div>
                
                <div class="detail-page-section">
                    <h3>Performance Metrics</h3>
                    <p><strong>Outcome Grade:</strong> ${hospital.TIER_2_GRADE_Outcome}</p>
                    <p><strong>Value Grade:</strong> ${hospital.TIER_2_GRADE_Value}</p>
                    <p><strong>Civic Grade:</strong> ${hospital.TIER_2_GRADE_Civic}</p>
                    <p><strong>Patient Safety Grade:</strong> ${hospital.TIER_3_GRADE_Pat_Saf}</p>
                    <p><strong>Patient Experience Grade:</strong> ${hospital.TIER_3_GRADE_Pat_Exp}</p>
                    <p><strong>Cost Effectiveness Grade:</strong> ${hospital.TIER_3_GRADE_Cost_Eff}</p>
                    <p><strong>Executive Compensation Grade:</strong> ${hospital.TIER_3_GRADE_Exec_Comp}</p>
                    <p><strong>Community Benefit Grade:</strong> ${hospital.TIER_3_GRADE_CB}</p>
                    <p><strong>Inclusivity Grade:</strong> ${hospital.TIER_3_GRADE_Inclusivity}</p>
                </div>
            </div>
            
            <h3>Detailed Metrics</h3>
            <div class="detail-page-grid">
                <div class="detail-page-section">
                    <h4>Outcome Measures</h4>
                    ${Object.entries(hospital)
                        .filter(([key]) => key.includes('Outcome') && (key.includes('STARS') || key.includes('GRADE')))
                        .map(([key, value]) => `<p><strong>${formatMetricName(key)}:</strong> ${value}</p>`)
                        .join('')}
                </div>
                
                <div class="detail-page-section">
                    <h4>Patient Safety Measures</h4>
                    ${Object.entries(hospital)
                        .filter(([key]) => key.includes('Pat_Saf') && (key.includes('STARS') || key.includes('GRADE')))
                        .map(([key, value]) => `<p><strong>${formatMetricName(key)}:</strong> ${value}</p>`)
                        .join('')}
                </div>
            </div>
            
            <h3>Location Map</h3>
            <div id="map" class="map-container"></div>
        `;
        
        // Insert the detail container at the top of the content area
        const contentArea = document.querySelector('.content-area');
        contentArea.parentNode.insertBefore(detailContainer, contentArea);
        
        // Initialize the map
        initMap(lat, lng, hospital.Name, hospital.TIER_1_GRADE_Lown_Composite);
    }
    
    function initMap(lat, lng, name, grade) {
        // Create a map centered at the hospital location
        const map = L.map('map').setView([lat, lng], 13);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Determine marker color based on grade
        let markerColor;
        switch(grade) {
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
            html: `<div style="background-color: ${markerColor}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${grade}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        // Add a marker for the hospital
        L.marker([lat, lng], {icon: hospitalIcon})
            .addTo(map)
            .bindPopup(`<b>${name}</b><br>Grade: ${grade}`)
            .openPopup();
    }
    
    function formatMetricName(metric) {
        // Convert camelCase or snake_case to readable format
        return metric
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/\b(STARS|GRADE|RANK|TIER|DY|MORT|READM|Pat|Saf|Exp|OU|Comp|CB)\b/g, match => {
                const abbreviations = {
                    'STARS': 'Stars',
                    'GRADE': 'Grade',
                    'RANK': 'Rank',
                    'TIER': 'Tier',
                    'DY': 'Day',
                    'MORT': 'Mortality',
                    'READM': 'Readmission',
                    'Pat': 'Patient',
                    'Saf': 'Safety',
                    'Exp': 'Experience',
                    'OU': 'Overuse',
                    'Comp': 'Compensation',
                    'CB': 'Community Benefit'
                };
                return abbreviations[match] || match;
            });
    }
});
