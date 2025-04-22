document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const calendarEl = document.getElementById('calendar');
    const monthYearEl = document.getElementById('month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const todayBtn = document.getElementById('today-btn');
    const monthlyPLValueEl = document.getElementById('monthly-pl-value');
    const formTitleEl = document.getElementById('form-title');
    const dateInput = document.getElementById('date');
    const profitLossInput = document.getElementById('profit-loss');
    const tradesInput = document.getElementById('trades');
    const saveDataBtn = document.getElementById('save-data');
    const deleteDataBtn = document.getElementById('delete-data');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const datePicker = document.getElementById('date-picker');
    const monthYearPickerEl = document.getElementById('month-year-picker');
    const prevMonthPickerBtn = document.getElementById('prev-month-picker');
    const nextMonthPickerBtn = document.getElementById('next-month-picker');
    const datePickerDaysEl = document.getElementById('date-picker-days');
    const notificationContainer = document.getElementById('notification-container');
    
    // Dialog elements
    const confirmDialog = document.getElementById('confirm-dialog');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOkBtn = document.getElementById('confirm-ok');
    const confirmCancelBtn = document.getElementById('confirm-cancel');
    const aboutDialog = document.getElementById('about-dialog');
    const aboutCloseBtn = document.getElementById('about-close');

    // Current date and displayed date
    const today = new Date();
    let currentDate = new Date();
    let displayedMonth = currentDate.getMonth();
    let displayedYear = currentDate.getFullYear();
    
    // Store trading data
    let tradingData = {};
    
    // Track if we're in edit mode
    let isEditMode = false;
    let originalDateKey = null;
    
    // Check if we're running in Electron
    const isElectron = window.electronAPI !== undefined;
    const isMac = isElectron && window.electronAPI.platform === 'darwin';
    const isWindows = isElectron && window.electronAPI.platform === 'win32';
    
    // Apply platform-specific classes
    if (isMac) {
        document.body.classList.add('mac-platform');
    } else if (isWindows) {
        document.body.classList.add('win-platform');
    }

    // Initialize
    initializeApp();

    // Event Listeners
    prevMonthBtn.addEventListener('click', showPreviousMonth);
    nextMonthBtn.addEventListener('click', showNextMonth);
    todayBtn.addEventListener('click', showCurrentMonth);
    
    dateInput.addEventListener('click', showDatePicker);
    
    // Ensure input fields are always enabled
    profitLossInput.addEventListener('focus', function() {
        this.disabled = false;
        this.readOnly = false;
    });
    
    tradesInput.addEventListener('focus', function() {
        this.disabled = false;
        this.readOnly = false;
    });
    
    prevMonthPickerBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        updatePickerMonth(-1);
    });
    
    nextMonthPickerBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        updatePickerMonth(1);
    });
    
    saveDataBtn.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent form submission
        saveTradeData();
        return false; // Prevent event bubbling
    });
    
    deleteDataBtn.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent form submission
        showConfirmDialog(
            'Delete Trading Data', 
            `Are you sure you want to delete data for ${originalDateKey}?`,
            deleteTradeData
        );
        return false; // Prevent event bubbling
    });
    
    cancelEditBtn.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent form submission
        cancelEdit();
        return false; // Prevent event bubbling
    });
    
    // Confirmation dialog event listeners
    confirmOkBtn.addEventListener('click', function() {
        // The action function is stored in the button's data attribute
        const action = confirmOkBtn.getAttribute('data-action');
        if (action && typeof window[action] === 'function') {
            window[action]();
        }
        hideConfirmDialog();
    });
    
    confirmCancelBtn.addEventListener('click', hideConfirmDialog);
    
    // About dialog event listener
    aboutCloseBtn.addEventListener('click', hideAboutDialog);
    
    // Close date picker when clicking outside
    document.addEventListener('click', function(e) {
        if (!datePicker.contains(e.target) && e.target !== dateInput) {
            datePicker.classList.add('hidden');
        }
    });
    
    // Register Electron menu event handlers if available
    if (isElectron) {
        window.electronAPI.onMenuSaveFile(() => saveToFile());
        window.electronAPI.onMenuLoadFile(() => loadFromFile());
        window.electronAPI.onMenuExportCsv(() => exportData());
        window.electronAPI.onMenuImportCsv(() => importData());
        window.electronAPI.onShowAbout(() => showAboutDialog());
    }
    
    // Functions
    function initializeApp() {
        // Load data from storage
        loadFromStorage();
        
        // Initialize calendar
        renderCalendar();
        
        // Ensure input fields are enabled
        setTimeout(function() {
            profitLossInput.disabled = false;
            tradesInput.disabled = false;
            profitLossInput.readOnly = false;
            tradesInput.readOnly = false;
        }, 100);
        
        // Make deleteTradeData globally available for the confirm dialog
        window.deleteTradeData = deleteTradeData;
    }
    
    function renderCalendar() {
        // Clear existing rows except header
        const rows = calendarEl.querySelectorAll('.calendar-row');
        rows.forEach(row => row.remove());
        
        // Update month/year display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        monthYearEl.textContent = `${monthNames[displayedMonth]} ${displayedYear}`;
        
        // Get first day of month and number of days
        const firstDay = new Date(displayedYear, displayedMonth, 1);
        const lastDay = new Date(displayedYear, displayedMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Get day of week of first day (0 = Sunday, 6 = Saturday)
        const firstDayOfWeek = firstDay.getDay();
        
        // Calculate previous month's days to show
        const prevMonthLastDay = new Date(displayedYear, displayedMonth, 0).getDate();
        
        // Calculate total cells needed (max 6 rows of 7 days)
        const totalDays = firstDayOfWeek + daysInMonth;
        const totalRows = Math.ceil(totalDays / 7);
        
        // Generate calendar rows
        let date = 1;
        let nextMonthDate = 1;
        let weekNumber = 1;
        
        for (let i = 0; i < totalRows; i++) {
            const row = document.createElement('div');
            row.className = 'calendar-row';
            
            // Create week summary cell
            const weekSummaryCell = document.createElement('div');
            weekSummaryCell.className = 'calendar-cell week-summary';
            
            // Calculate week summary
            const weekStart = new Date(displayedYear, displayedMonth, (i * 7) + 1 - firstDayOfWeek);
            const weekStartFormatted = formatDate(weekStart);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekEndFormatted = formatDate(weekEnd);
            
            // Get week's P/L data
            let weekPL = 0;
            let weekTrades = 0;
            
            for (let d = 0; d < 7; d++) {
                const currentDate = new Date(weekStart);
                currentDate.setDate(currentDate.getDate() + d);
                const dateKey = formatDate(currentDate);
                
                if (tradingData[dateKey]) {
                    weekPL += tradingData[dateKey].pl;
                    weekTrades += tradingData[dateKey].trades;
                }
            }
            
            weekSummaryCell.innerHTML = `
                <div>Week ${weekNumber}</div>
                <div class="${weekPL >= 0 ? 'profit' : 'loss'}">$${Math.abs(weekPL).toFixed(2)}</div>
                <div>${weekTrades} trades</div>
            `;
            
            // Create day cells for this row
            for (let j = 0; j < 7; j++) {
                const cell = document.createElement('div');
                cell.className = 'calendar-cell';
                
                // Previous month days
                if (i === 0 && j < firstDayOfWeek) {
                    const prevMonthDay = prevMonthLastDay - (firstDayOfWeek - j - 1);
                    cell.classList.add('other-month');
                    cell.innerHTML = `<div class="day-number">${prevMonthDay}</div>`;
                }
                // Current month days
                else if (date <= daysInMonth) {
                    // Check if this is today
                    const isToday = date === today.getDate() && 
                                   displayedMonth === today.getMonth() && 
                                   displayedYear === today.getFullYear();
                    
                    if (isToday) {
                        cell.classList.add('today');
                    }
                    
                    // Get trading data for this day
                    const dateObj = new Date(displayedYear, displayedMonth, date);
                    const dateKey = formatDate(dateObj);
                    let dayData = tradingData[dateKey] || { pl: 0, trades: 0 };
                    
                    // Create cell content
                    let cellContent = `<div class="day-number">${date}</div>`;
                    
                    if (dayData.pl !== 0 || dayData.trades !== 0) {
                        cellContent += `
                            <div class="day-pl ${dayData.pl >= 0 ? 'profit' : 'loss'}">$${Math.abs(dayData.pl).toFixed(2)}</div>
                            <div class="day-trades">${dayData.trades} trade${dayData.trades !== 1 ? 's' : ''}</div>
                            <div class="day-actions">
                                <button class="day-edit" data-date="${dateKey}">Edit</button>
                                <button class="day-delete" data-date="${dateKey}">Delete</button>
                            </div>
                        `;
                    }
                    
                    cell.innerHTML = cellContent;
                    
                    // Add click event to select date for new entries
                    cell.addEventListener('click', function(e) {
                        // Only select date if not clicking on edit/delete buttons
                        if (!e.target.classList.contains('day-edit') && 
                            !e.target.classList.contains('day-delete')) {
                            selectDate(dateObj);
                        }
                    });
                    
                    // Add edit button event listener
                    const editBtn = cell.querySelector('.day-edit');
                    if (editBtn) {
                        editBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            const dateKey = this.getAttribute('data-date');
                            editTradeData(dateKey);
                        });
                    }
                    
                    // Add delete button event listener
                    const deleteBtn = cell.querySelector('.day-delete');
                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            const dateKey = this.getAttribute('data-date');
                            
                            // Use custom confirm dialog instead of browser confirm
                            showConfirmDialog(
                                'Delete Trading Data', 
                                `Are you sure you want to delete data for ${dateKey}?`, 
                                function() {
                                    delete tradingData[dateKey];
                                    saveToStorage();
                                    renderCalendar();
                                    showNotification('Data deleted successfully');
                                }
                            );
                        });
                    }
                    
                    date++;
                }
                // Next month days
                else {
                    cell.classList.add('other-month');
                    cell.innerHTML = `<div class="day-number">${nextMonthDate}</div>`;
                    nextMonthDate++;
                }
                
                row.appendChild(cell);
            }
            
            // Add week summary cell to the row
            row.appendChild(weekSummaryCell);
            calendarEl.appendChild(row);
            weekNumber++;
        }
        
        // Update monthly P/L
        updateMonthlyPL();
        
        // Ensure input fields are enabled
        setTimeout(function() {
            profitLossInput.disabled = false;
            tradesInput.disabled = false;
            profitLossInput.readOnly = false;
            tradesInput.readOnly = false;
        }, 100);
    }
    
    function updateMonthlyPL() {
        let monthlyPL = 0;
        
        // Loop through all days in current month
        const daysInMonth = new Date(displayedYear, displayedMonth + 1, 0).getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(displayedYear, displayedMonth, i);
            const dateKey = formatDate(dateObj);
            
            if (tradingData[dateKey]) {
                monthlyPL += tradingData[dateKey].pl;
            }
        }
        
        // Update display
        monthlyPLValueEl.textContent = `$${Math.abs(monthlyPL).toFixed(2)}`;
        monthlyPLValueEl.className = monthlyPL >= 0 ? 'profit' : 'loss';
    }
    
    function showPreviousMonth() {
        displayedMonth--;
        if (displayedMonth < 0) {
            displayedMonth = 11;
            displayedYear--;
        }
        renderCalendar();
    }
    
    function showNextMonth() {
        displayedMonth++;
        if (displayedMonth > 11) {
            displayedMonth = 0;
            displayedYear++;
        }
        renderCalendar();
    }
    
    function showCurrentMonth() {
        displayedMonth = today.getMonth();
        displayedYear = today.getFullYear();
        renderCalendar();
    }
    
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}/${day}/${year}`;
    }
    
    function parseDate(dateString) {
        const parts = dateString.split('/');
        return new Date(parts[2], parts[0] - 1, parts[1]);
    }
    
    function selectDate(date) {
        // Don't allow selection if in edit mode
        if (isEditMode) return;
        
        dateInput.value = formatDate(date);
        highlightElement(dateInput);
        
        // Ensure input fields are enabled
        setTimeout(function() {
            profitLossInput.disabled = false;
            tradesInput.disabled = false;
            profitLossInput.readOnly = false;
            tradesInput.readOnly = false;
            
            // Focus on profit/loss input
            profitLossInput.focus();
        }, 100);
    }
    
    function showDatePicker() {
        // Don't show date picker if in edit mode
        if (isEditMode) return;
        
        // Position the date picker below the date input
        const inputRect = dateInput.getBoundingClientRect();
        datePicker.style.top = `${inputRect.bottom + window.scrollY + 5}px`;
        datePicker.style.left = `${inputRect.left + window.scrollX}px`;
        
        // Set the date picker to the current input date or today
        let pickerDate;
        if (dateInput.value) {
            pickerDate = parseDate(dateInput.value);
        } else {
            pickerDate = new Date();
        }
        
        // Update date picker display
        renderDatePicker(pickerDate.getMonth(), pickerDate.getFullYear(), pickerDate);
        
        // Show the date picker
        datePicker.classList.remove('hidden');
    }
    
    function renderDatePicker(month, year, selectedDate) {
        // Update month/year display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        monthYearPickerEl.textContent = `${monthNames[month]} ${year}`;
        
        // Clear previous days
        datePickerDaysEl.innerHTML = '';
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Get day of week of first day (0 = Sunday, 6 = Saturday)
        const firstDayOfWeek = firstDay.getDay();
        
        // Add days from previous month
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = 0; i < firstDayOfWeek; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'date-picker-day other-month';
            dayEl.textContent = prevMonthLastDay - (firstDayOfWeek - i - 1);
            datePickerDaysEl.appendChild(dayEl);
        }
        
        // Add days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'date-picker-day';
            dayEl.textContent = i;
            
            // Check if this day is selected
            if (selectedDate && 
                i === selectedDate.getDate() && 
                month === selectedDate.getMonth() && 
                year === selectedDate.getFullYear()) {
                dayEl.classList.add('selected');
            }
            
            // Add click event
            dayEl.addEventListener('click', function(e) {
                e.stopPropagation();
                const selectedDate = new Date(year, month, i);
                dateInput.value = formatDate(selectedDate);
                datePicker.classList.add('hidden');
                highlightElement(dateInput);
                
                // Ensure input fields are enabled and focus on profit/loss
                setTimeout(function() {
                    profitLossInput.disabled = false;
                    tradesInput.disabled = false;
                    profitLossInput.readOnly = false;
                    tradesInput.readOnly = false;
                    profitLossInput.focus();
                }, 100);
            });
            
            datePickerDaysEl.appendChild(dayEl);
        }
        
        // Add days from next month
        const totalCells = 42; // 6 rows of 7 days
        const remainingCells = totalCells - (firstDayOfWeek + daysInMonth);
        for (let i = 1; i <= remainingCells; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'date-picker-day other-month';
            dayEl.textContent = i;
            datePickerDaysEl.appendChild(dayEl);
        }
    }
    
    function updatePickerMonth(change) {
        // Get current picker month/year
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const currentText = monthYearPickerEl.textContent;
        const parts = currentText.split(' ');
        let month = monthNames.indexOf(parts[0]);
        let year = parseInt(parts[1]);
        
        // Update month
        month += change;
        if (month < 0) {
            month = 11;
            year--;
        } else if (month > 11) {
            month = 0;
            year++;
        }
        
        // Re-render date picker
        let selectedDate = null;
        if (dateInput.value) {
            selectedDate = parseDate(dateInput.value);
        }
        
        renderDatePicker(month, year, selectedDate);
    }
    
    function saveTradeData() {
        const date = dateInput.value;
        const profitLoss = parseFloat(profitLossInput.value) || 0;
        const trades = parseInt(tradesInput.value) || 0;
        
        if (!date) {
            showNotification('Please select a date', 'error');
            return;
        }
        
        // If in edit mode and date was changed, delete the old entry
        if (isEditMode && originalDateKey !== date) {
            delete tradingData[originalDateKey];
        }
        
        // Save data
        tradingData[date] = {
            pl: profitLoss,
            trades: trades
        };
        
        // Save to storage
        saveToStorage();
        
        // Clear form and reset edit mode
        resetForm();
        
        // Update calendar
        renderCalendar();
        
        // Show success notification
        showNotification('Data saved successfully');
        
        // Ensure input fields are enabled for next entry
        setTimeout(function() {
            profitLossInput.disabled = false;
            tradesInput.disabled = false;
            profitLossInput.readOnly = false;
            tradesInput.readOnly = false;
        }, 100);
    }
    
    function editTradeData(dateKey) {
        // Set edit mode
        isEditMode = true;
        originalDateKey = dateKey;
        
        // Update form title
        formTitleEl.textContent = 'Edit Trading Data';
        
        // Fill form with existing data
        dateInput.value = dateKey;
        profitLossInput.value = tradingData[dateKey].pl;
        tradesInput.value = tradingData[dateKey].trades;
        
        // Ensure input fields are enabled
        profitLossInput.disabled = false;
        tradesInput.disabled = false;
        profitLossInput.readOnly = false;
        tradesInput.readOnly = false;
        
        // Show delete and cancel buttons
        deleteDataBtn.classList.remove('hidden');
        cancelEditBtn.classList.remove('hidden');
        
        // Scroll to form
        document.querySelector('.data-entry-form').scrollIntoView({ behavior: 'smooth' });
        
        // Focus on profit/loss input
        setTimeout(function() {
            profitLossInput.focus();
        }, 100);
    }
    
    function deleteTradeData() {
        if (!isEditMode || !originalDateKey) return;
        
        // Delete the data
        delete tradingData[originalDateKey];
        
        // Save to storage
        saveToStorage();
        
        // Reset form and edit mode
        resetForm();
        
        // Update calendar
        renderCalendar();
        
        // Show success notification
        showNotification('Data deleted successfully');
    }
    
    function cancelEdit() {
        resetForm();
    }
    
    function resetForm() {
        // Reset edit mode
        isEditMode = false;
        originalDateKey = null;
        
        // Reset form title
        formTitleEl.textContent = 'Enter Trading Data';
        
        // Clear form
        dateInput.value = '';
        profitLossInput.value = '';
        tradesInput.value = '';
        
        // Ensure input fields are enabled
        profitLossInput.disabled = false;
        tradesInput.disabled = false;
        profitLossInput.readOnly = false;
        tradesInput.readOnly = false;
        
        // Hide delete and cancel buttons
        deleteDataBtn.classList.add('hidden');
        cancelEditBtn.classList.add('hidden');
    }
    
    // Notification System
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Create notification content
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', function() {
            removeNotification(notification);
        });
        
        notification.appendChild(messageSpan);
        notification.appendChild(closeBtn);
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            removeNotification(notification);
        }, 3000);
    }
    
    function removeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    // Dialog System
    function showConfirmDialog(title, message, confirmAction) {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        
        // Store the action function name
        if (typeof confirmAction === 'function') {
            // Create a global function reference
            const functionName = 'confirmAction' + Date.now();
            window[functionName] = confirmAction;
            confirmOkBtn.setAttribute('data-action', functionName);
        }
        
        confirmDialog.classList.remove('hidden');
        setTimeout(() => {
            confirmDialog.classList.add('show');
        }, 10);
    }
    
    function hideConfirmDialog() {
        confirmDialog.classList.remove('show');
        setTimeout(() => {
            confirmDialog.classList.add('hidden');
            // Clean up the global function reference
            const functionName = confirmOkBtn.getAttribute('data-action');
            if (functionName && window[functionName]) {
                delete window[functionName];
            }
        }, 300);
    }
    
    function showAboutDialog() {
        aboutDialog.classList.remove('hidden');
        setTimeout(() => {
            aboutDialog.classList.add('show');
        }, 10);
    }
    
    function hideAboutDialog() {
        aboutDialog.classList.remove('show');
        setTimeout(() => {
            aboutDialog.classList.add('hidden');
        }, 300);
    }
    
    // Storage functions
    function saveToStorage() {
        try {
            localStorage.setItem('tradingCalendarData', JSON.stringify(tradingData));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            showNotification('Error saving data to local storage', 'error');
        }
    }
    
    function loadFromStorage() {
        try {
            const storedData = localStorage.getItem('tradingCalendarData');
            if (storedData) {
                tradingData = JSON.parse(storedData);
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            tradingData = {};
        }
    }
    
    // File operations
    async function saveToFile() {
        try {
            const jsonData = JSON.stringify(tradingData, null, 2);
            
            if (isElectron) {
                const success = await window.electronAPI.saveFile(jsonData);
                if (success) {
                    showNotification('File saved successfully');
                } else {
                    showNotification('Failed to save file', 'error');
                }
            } else {
                // Fallback for web browser
                const blob = new Blob([jsonData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'trading_calendar_data.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showNotification('File downloaded successfully');
            }
        } catch (error) {
            console.error('Error saving file:', error);
            showNotification('Error saving file: ' + error.message, 'error');
        }
    }
    
    async function loadFromFile() {
        try {
            if (isElectron) {
                const fileData = await window.electronAPI.loadFile();
                if (fileData) {
                    try {
                        tradingData = JSON.parse(fileData);
                        saveToStorage();
                        renderCalendar();
                        showNotification('Data loaded successfully');
                    } catch (parseError) {
                        showNotification('Error parsing file: Invalid JSON format', 'error');
                    }
                }
            } else {
                // Fallback for web browser
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                
                input.onchange = function(e) {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        try {
                            tradingData = JSON.parse(event.target.result);
                            saveToStorage();
                            renderCalendar();
                            showNotification('Data loaded successfully');
                        } catch (error) {
                            showNotification('Error parsing file: Invalid JSON format', 'error');
                        }
                    };
                    reader.readAsText(file);
                };
                
                input.click();
            }
        } catch (error) {
            console.error('Error loading file:', error);
            showNotification('Error loading file: ' + error.message, 'error');
        }
    }
    
    async function exportData() {
        try {
            // Convert data to CSV
            let csv = 'Date,Profit/Loss,Trades\n';
            
            for (const date in tradingData) {
                const data = tradingData[date];
                csv += `${date},${data.pl},${data.trades}\n`;
            }
            
            if (isElectron) {
                const success = await window.electronAPI.exportCSV(csv);
                if (success) {
                    showNotification('CSV exported successfully');
                } else {
                    showNotification('Failed to export CSV', 'error');
                }
            } else {
                // Fallback for web browser
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'trading_data.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showNotification('CSV downloaded successfully');
            }
        } catch (error) {
            console.error('Error exporting CSV:', error);
            showNotification('Error exporting CSV: ' + error.message, 'error');
        }
    }
    
    async function importData() {
        try {
            if (isElectron) {
                const csvData = await window.electronAPI.importCSV();
                if (csvData) {
                    processCSVImport(csvData);
                }
            } else {
                // Fallback for web browser
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv';
                
                input.onchange = function(e) {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        processCSVImport(event.target.result);
                    };
                    reader.readAsText(file);
                };
                
                input.click();
            }
        } catch (error) {
            console.error('Error importing CSV:', error);
            showNotification('Error importing CSV: ' + error.message, 'error');
        }
    }
    
    function processCSVImport(csvData) {
        try {
            const lines = csvData.split('\n');
            
            // Clear existing data
            tradingData = {};
            
            // Skip header line
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue;
                
                const parts = lines[i].split(',');
                const date = parts[0];
                const pl = parseFloat(parts[1]);
                const trades = parseInt(parts[2]);
                
                if (date && !isNaN(pl) && !isNaN(trades)) {
                    tradingData[date] = {
                        pl: pl,
                        trades: trades
                    };
                }
            }
            
            // Save to storage
            saveToStorage();
            
            // Update calendar
            renderCalendar();
            
            showNotification('Data imported successfully');
        } catch (error) {
            console.error('Error processing CSV:', error);
            showNotification('Error processing CSV: ' + error.message, 'error');
        }
    }
    
    function highlightElement(element) {
        element.classList.add('highlight');
        setTimeout(() => {
            element.classList.remove('highlight');
        }, 1000);
    }
});
