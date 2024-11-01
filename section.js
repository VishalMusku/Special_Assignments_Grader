// Initialize sectionID globally or set it explicitly if needed.


const urlParams = new URLSearchParams(window.location.search);
let sectionID = urlParams.get('id') || '001'; // Default to '001' if no ID is found
sectionID = sectionID.padStart(3, '0'); 

let relevantStudents = [];
let filteredData = [];

let processedData = []; // Declare processedData at a higher scope if it needs to be accessed by multiple functions
let joinedData = [];

// Show the selected section content
function showSection(sectionID) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.style.display = 'none');
    document.getElementById(sectionID).style.display = 'block';
}

// Load the roster data for the section
async function loadRosterData() {
    console.log('Loading roster data for section:', sectionID);
    const rosterContent = document.getElementById("rosterContent");
    
    try {
        // Fetch section-specific roster or fallback to master roster if not found
        let response = await fetch(`course_roster_${sectionID}.json`);
        console.log('Initial fetch response status:', response.status);

        if (!response.ok) {
            if (response.status === 404) {
                console.log('Section-specific roster not found, loading master roster');
                response = await fetch('course_roster_master.json');
            } else {
                throw new Error(`Failed to fetch section roster: ${response.status}`);
            }
        }

        const data = await response.json();
        if (!data.roster || !Array.isArray(data.roster)) {
            throw new Error('Invalid roster data format');
        }


        // Filter data if using master roster
            relevantStudents = data.roster.filter(student => 
            !data.is_master || student.section === sectionID
        );

        // Generate HTML for the roster table with serial number
        let tableHTML = `
            <h3>Course Roster</h3>
            <table class="roster-table">
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Sooner ID</th>
                        <th>Email Address</th>
                    </tr>
                </thead>
                <tbody>
        `;

        relevantStudents.forEach((student, index) => {
            tableHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${student["First Name"]}</td>
                    <td>${student["Last Name"]}</td>
                    <td>${student["Sooner ID"]}</td>
                    <td>${student["Email Address"]}</td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        rosterContent.innerHTML = tableHTML;
        showSection("rosterView");
        console.log('Roster data loaded successfully.');

    } catch (error) {
        console.error("Error loading Course Roster:", error);
        rosterContent.innerHTML = `
            <h3>Error Loading Roster</h3>
            <p>Error: ${error.message}</p>
            <p>Please check that:</p>
            <ul>
                <li>The JSON files are in the correct location</li>
                <li>You're running this on a web server (not directly opening the HTML file)</li>
                <li>The file names match: course_roster_${sectionID}.json or course_roster_master.json</li>
            </ul>`;
        showSection("rosterView");
    }
    
}



function uploadAssignmentGrade() {
    const fileInput = document.getElementById('assignmentFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Assuming the first sheet is the one you want to read
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        range.s.r = 3; // Set the starting row to 4 (0-based index)

        // Convert the sheet to JSON, starting from the fourth row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            range: range // Specify the range to read
        });

        // // Convert the sheet to JSON
        // const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Filter the data to keep only the desired columns
        filteredData = jsonData.map(student => ({
            'First Name': student['First Name'],
            'Last Name': student['Last Name'],
            'Email': student['Email'],
            'Grade': student['Grade']
        }));

        // Create a table to display the filtered data
        const tableHTML = `
            <h3>Uploaded Assignment Grades</h3>
            <table class="grades-table">
                <thead>
                    <tr>
                        <th>S.No</th> <!-- Serial Number Header -->
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Email</th>
                        <th>Grade</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map((student, index) => `
                        <tr>
                            <td>${index + 1}</td> <!-- Serial Number -->
                            <td>${student['First Name'] || ''}</td>
                            <td>${student['Last Name'] || ''}</td>
                            <td>${student['Email'] || ''}</td>
                            <td>${student['Grade'] || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('assignmentGradeContent').innerHTML = tableHTML; // Display the table
    };

    reader.onerror = function () {
        alert('Error reading file.');
    };

    reader.readAsArrayBuffer(file); // Read the file as an ArrayBuffer
   
}



function showProcessData() {
    document.getElementById('processData').style.display = 'block';
}

function processAndDisplayData() {

    showProcessData();

    console.log("Starting data processing...");

    // Check if relevantStudents array is defined and not empty
    if (!relevantStudents || !relevantStudents.length) {
        console.error("Relevant students array is empty or undefined");
        alert("Please upload the relevant students before processing.");
        return;
    }

    // Check if filteredData array is defined and not empty
    if (!filteredData || !filteredData.length) {
        console.error("Filtered data array is empty or undefined");
        alert("Please upload assignment grades before processing.");
        return;
    }

    // Step 1: Inner join relevantStudents with filteredData on 'Email Address' = 'Email'
    let joinedData = relevantStudents.map(student => {
        if (!student['Email Address']) {
            console.warn("Relevant student entry missing email:", student);
            return null;
        }

        const gradeEntry = filteredData.find(gradeRow => 
            gradeRow.Email && 
            gradeRow.Email.trim().toLowerCase() === student['Email Address'].trim().toLowerCase()
        );

        if (gradeEntry) {
            return {
                firstName: student.firstName || 'Unknown',
                lastName: student.lastName || 'Unknown',
                email: student['Email Address'],
                grade: gradeEntry.Grade ? (parseFloat(gradeEntry.Grade) * 10).toFixed(2) : '0'
            };
        }
        return null;
    }).filter(entry => entry !== null);

    console.log("Joined Data:", joinedData);

    if (joinedData.length === 0) {
        console.warn("No matching data found after processing");
        alert("No matching data found after processing. Please check your input files.");
        return;
    }

    // Display the processed data
    displayProcessedData(joinedData);
}

function displayProcessedData(data) {
    const processedDataElement = document.getElementById('processedDataContent');
    processedDataElement.innerHTML = ''; // Clear previous content

    const table = document.createElement('table');
    table.id = 'processedDataTable';
    table.className = 'data-table';

    // Create header row
    const headerRow = table.insertRow();
    const headers = ['S.No.', 'First Name', 'Last Name', 'Email', 'Grade'];
    headers.forEach((header) => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });

    // Populate data rows
    data.forEach((row, index) => {
        const dataRow = table.insertRow();
        [index + 1, row.firstName, row.lastName, row.email, row.grade].forEach(cellData => {
            const cell = dataRow.insertCell();
            cell.textContent = cellData;
        });
    });

    processedDataElement.appendChild(table);
}



// document.getElementById('processButton').addEventListener('click', processData);

// function processData() {
//     // Check if both relevantStudents and filteredData are populated
//     if (relevantStudents.length === 0 || filteredData.length === 0) {
//         alert('Please load both the roster data and the assignment grades before processing.');
//         return;
//     }

//     // Perform the join
//     const joinedData = relevantStudents.map(student => {
//         const gradeData = filteredData.find(gradeStudent => 
//             gradeStudent['Email'].toLowerCase() === student['Email Address'].toLowerCase()
//         );


//         const gradeValue = gradeData && gradeData['Grade'] && gradeData['Grade'] !== 'n/a'
//     ? (gradeData['Grade'] * 10).toFixed(1) : 0;


//     return {
//         ...student, // Include all properties from relevantStudents
//         Grade: gradeValue // Add the processed grade
//     };



//     });

//     // Display the joined data
//     displayJoinedData(joinedData);
// }


// function displayJoinedData(joinedData) {
//     let tableHTML = `
//         <h3>Final Results</h3>
//         <table class="joined-data-table">
//             <thead>
//                 <tr>
//                     <th>S.No</th>
//                     <th>First Name</th>
//                     <th>Last Name</th>
//                     <th>Sooner ID</th>
//                     <th>Email Address</th>
//                     <th>Grade</th>
//                 </tr>
//             </thead>
//             <tbody>
//                 ${joinedData.map((student, index) => `
//                     <tr>
//                         <td>${index + 1}</td>
//                         <td>${student['First Name']}</td>
//                         <td>${student['Last Name']}</td>
//                         <td>${student['Sooner ID']}</td>
//                         <td>${student['Email Address']}</td>
//                         <td>${student['Grade']}</td>
//                     </tr>
//                 `).join('')}
//             </tbody>
//         </table>
//     `;

//     document.getElementById('joinedDataContent').innerHTML = tableHTML; 
// }



document.getElementById('processButton').addEventListener('click', processData);

        function processData() {
            // Check if both relevantStudents and filteredData are populated
            if (relevantStudents.length === 0 || filteredData.length === 0) {
                alert('Please load both the roster data and the assignment grades before processing.');
                return;
            }

            // Perform the join
            const joinedData = relevantStudents.map(student => {
                const gradeData = filteredData.find(gradeStudent => 
                    gradeStudent['Email'].toLowerCase() === student['Email Address'].toLowerCase()
                );

                const gradeValue = gradeData && gradeData['Grade'] && gradeData['Grade'] !== 'n/a'
                    ? (gradeData['Grade'] * 10).toFixed(1) : 0;

                return {
                    ...student, // Include all properties from relevantStudents
                    Grade: gradeValue // Add the processed grade
                };
            });

            // Display the joined data
            displayJoinedData(joinedData);
        }

        function displayJoinedData(joinedData) {
            let tableHTML = `
                <h3>Final Results</h3>
                <table class="joined-data-table">
                    <thead>
                        <tr>
                            <th>S.No <button class="toggle-btn" onclick="toggleColumn(0)">▼</button></th>
                            <th>First Name <button class="toggle-btn" onclick="toggleColumn(1)">▼</button></th>
                            <th>Last Name <button class="toggle-btn" onclick="toggleColumn(2)">▼</button></th>
                            <th>Sooner ID <button class="toggle-btn" onclick="toggleColumn(3)">▼</button></th>
                            <th>Email Address <button class="toggle-btn" onclick="toggleColumn(4)">▼</button></th>
                            <th>Grade <button class="toggle-btn" onclick="toggleColumn(5)">▼</button></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${joinedData.map((student, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${student['First Name']}</td>
                                <td>${student['Last Name']}</td>
                                <td>${student['Sooner ID']}</td>
                                <td>${student['Email Address']}</td>
                                <td>${student['Grade']}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            document.getElementById('joinedDataContent').innerHTML = tableHTML; 
        }

        function toggleColumn(columnIndex) {
            const table = document.querySelector('.joined-data-table');
            const gradeColumnIndex = table.rows[0].cells.length - 1; // Get the index of the grade column

            for (let i = 0; i < table.rows.length; i++) {
                for (let j = 0; j < table.rows[i].cells.length; j++) {
                    // Show the selected column and the grade column, hide others
                    if (j === columnIndex || j === gradeColumnIndex) {
                        table.rows[i].cells[j].style.display = ''; // Show cell
                    } else {
                        table.rows[i].cells[j].style.display = 'none'; // Hide cell
                    }
                }
            }
        }