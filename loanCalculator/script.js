// Theme toggling
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    body.className = savedTheme;
}

themeToggle.addEventListener('click', () => {
    const newTheme = body.className === 'light-mode' ? 'dark-mode' : 'light-mode';
    body.className = newTheme;
    localStorage.setItem('theme', newTheme);
});

// Currency formatting
const currencySelect = document.getElementById('currency');
const customCurrencyInput = document.getElementById('customCurrencyInput');
const customCurrencySymbol = document.getElementById('customCurrencySymbol');

// Toggle custom currency input visibility
currencySelect.addEventListener('change', () => {
    customCurrencyInput.classList.toggle('hidden', currencySelect.value !== 'custom');
    localStorage.setItem('preferred-currency', currencySelect.value);
    if (currencySelect.value === 'custom') {
        const savedSymbol = localStorage.getItem('custom-currency-symbol');
        if (savedSymbol) {
            customCurrencySymbol.value = savedSymbol;
        }
    }
    // Recalculate if results are already shown
    if (!resultsDiv.classList.contains('hidden')) {
        loanForm.dispatchEvent(new Event('submit'));
    }
});

// Save custom currency symbol
customCurrencySymbol.addEventListener('change', () => {
    localStorage.setItem('custom-currency-symbol', customCurrencySymbol.value);
    if (!resultsDiv.classList.contains('hidden')) {
        loanForm.dispatchEvent(new Event('submit'));
    }
});

function getFormatter() {
    if (currencySelect.value === 'custom') {
        const symbol = customCurrencySymbol.value || '¤';
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true
        }).format;
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencySelect.value,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format;
}

// Load saved currency preference
const savedCurrency = localStorage.getItem('preferred-currency');
if (savedCurrency) {
    currencySelect.value = savedCurrency;
    if (savedCurrency === 'custom') {
        customCurrencyInput.classList.remove('hidden');
        const savedSymbol = localStorage.getItem('custom-currency-symbol');
        if (savedSymbol) {
            customCurrencySymbol.value = savedSymbol;
        }
    }
}

// Chart initialization
let paymentChart = null;

function createOrUpdateChart(principal, totalInterest) {
    const ctx = document.getElementById('paymentChart').getContext('2d');

    if (paymentChart) {
        paymentChart.destroy();
    }

    paymentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Principal', 'Interest'],
            datasets: [{
                data: [principal, totalInterest],
                backgroundColor: [
                    '#6C63FF',
                    '#00BFA6'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Form handling
const loanForm = document.getElementById('loanForm');
const resultsDiv = document.getElementById('results');
const printButton = document.getElementById('printButton');

function formatCurrency(amount) {
    const formatter = getFormatter();
    if (currencySelect.value === 'custom') {
        const symbol = customCurrencySymbol.value || '¤';
        return `${symbol}${formatter(amount)}`;
    }
    return formatter(amount);
}

loanForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const loanAmount = parseFloat(document.getElementById('loanAmount').value);
    const interestRate = parseFloat(document.getElementById('interestRate').value);
    const loanTerm = parseFloat(document.getElementById('loanTerm').value);

    const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, loanTerm);
    const totalPayment = monthlyPayment * loanTerm * 12;
    const totalInterest = totalPayment - loanAmount;

    // Update payment breakdown
    document.getElementById('monthlyPayment').textContent = formatCurrency(monthlyPayment);
    document.getElementById('totalPayment').textContent = formatCurrency(totalPayment);
    document.getElementById('totalInterest').textContent = formatCurrency(totalInterest);

    // Update chart
    createOrUpdateChart(loanAmount, totalInterest);

    // Generate amortization schedule
    const schedule = generateAmortizationSchedule(loanAmount, interestRate, loanTerm);
    const tableBody = document.querySelector('#amortizationTable tbody');
    tableBody.innerHTML = '';

    schedule.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.month}</td>
            <td>${formatCurrency(row.payment)}</td>
            <td>${formatCurrency(row.principal)}</td>
            <td>${formatCurrency(row.interest)}</td>
            <td>${formatCurrency(row.remainingBalance)}</td>
        `;
        tableBody.appendChild(tr);
    });

    resultsDiv.classList.remove('hidden');
});

// Print functionality
printButton.addEventListener('click', () => {
    window.print();
});

// Loan calculations
function calculateMonthlyPayment(principal, annualRate, years) {
    const monthlyRate = annualRate / 12 / 100;
    const numberOfPayments = years * 12;

    if (monthlyRate === 0) return principal / numberOfPayments;

    return (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
           (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
}

function generateAmortizationSchedule(principal, annualRate, years) {
    const schedule = [];
    const monthlyRate = annualRate / 12 / 100;
    const monthlyPayment = calculateMonthlyPayment(principal, annualRate, years);
    let remainingBalance = principal;

    for (let month = 1; month <= years * 12; month++) {
        const interest = remainingBalance * monthlyRate;
        const principalPayment = monthlyPayment - interest;
        remainingBalance -= principalPayment;

        schedule.push({
            month,
            payment: monthlyPayment,
            principal: principalPayment,
            interest,
            remainingBalance: Math.max(0, remainingBalance)
        });
    }

    return schedule;
}