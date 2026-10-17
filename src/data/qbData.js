export const INITIAL_BANK_TRANSACTIONS = [
  { id: 1, date: "11/24/2025", description: "Books By Bessie", payee: "", category: "Uncategorized Income", spent: null, received: 55.00, matchStatus: null, action: "Add" },
  { id: 2, date: "10/25/2025", description: "A Rental", payee: "Cool Cars", category: "Uncategorized Income", spent: null, received: 200.00, matchStatus: null, action: "Add", memo: "A1 RENTAL BACKHOE DEPOSIT REFUND" },
  { id: 3, date: "10/25/2025", description: "A Rental", payee: "", category: "Uncategorized Expense", spent: 1200.00, received: null, matchStatus: null, action: "Add" },
  { id: 4, date: "10/02/2025", description: "A Rental", payee: "", category: "Uncategorized Expense", spent: 800.00, received: null, matchStatus: null, action: "Add" },
  { id: 5, date: "09/29/2025", description: "Pam Seitz", payee: "Pam Seitz", category: "Pam Seitz", spent: 75.00, received: null, matchStatus: "2 matches found", action: "View" },
  { id: 6, date: "09/29/2025", description: "", payee: "", category: "Deposit", spent: null, received: 868.15, matchStatus: "1 match found", matchDetail: "Deposit 09/29/2025 ₹868.15", action: "Match" },
  { id: 7, date: "09/29/2025", description: "Hicks Hardware", payee: "Hicks Hardware", category: "Check 75", spent: 228.75, received: null, matchStatus: "1 match found", matchDetail: "Check 75 09/29/2025 -₹228.75 Hicks Hardware", action: "Match" },
  { id: 8, date: "09/28/2025", description: "Pg E", payee: "", category: "Bill Payment 6", spent: 114.09, received: null, matchStatus: "1 match found", action: "Match" },
  { id: 9, date: "09/28/2025", description: "", payee: "", category: "Transfer", spent: null, received: 408.00, matchStatus: null, action: "Match" },
  { id: 10, date: "09/27/2025", description: "Travis Waldron", payee: "", category: "Payment", spent: 103.55, received: null, matchStatus: null, action: "Match" },
  { id: 11, date: "09/27/2025", description: "Pye's Cakes", payee: "", category: "Meals", spent: 87.50, received: null, matchStatus: null, action: "Match" },
  { id: 12, date: "09/27/2025", description: "", payee: "", category: "Deposit", spent: null, received: 50.00, matchStatus: null, action: "Match" },
  { id: 13, date: "09/27/2025", description: "Squeaky Kleen Car", payee: "", category: "Automobile", spent: 19.99, received: null, matchStatus: null, action: "View" },
  { id: 14, date: "09/27/2025", description: "", payee: "", category: "Income", spent: null, received: 218.75, matchStatus: null, action: "Match" },
];

export const INITIAL_CUSTOMERS = [
  { id: 1, name: "County Parks Department", company: "County Parks Department", phone: "517-111-2223", openBalance: 100.00, action: "Receive payment" },
  { id: 2, name: "Abbott Softball Complex and Water Park", company: "Abbott Softball Complex and Water Park", phone: "517-111-2525", openBalance: 0.00, action: "Create invoice" },
  { id: 3, name: "Dan Wisnewki", company: "Dan Wisnewki", phone: "", openBalance: 150.00, action: "Receive payment" },
  { id: 4, name: "EL Sports Complex", company: "Mr. David Jones", phone: "", openBalance: 2600.00, action: "Receive payment" },
  { id: 5, name: "Lansing Youth Soccer League", company: "Lansing Youth Soccer League", phone: "", openBalance: 0.00, action: "Create invoice" },
  { id: 6, name: "Mary Fontaine", company: "Mary Fontaine", phone: "", openBalance: 0.00, action: "Create invoice" },
  { id: 7, name: "Shontae DeRose", company: "Shontae DeRose", phone: "", openBalance: 0.00, action: "Create invoice" },
  { id: 8, name: "St. Paul's School", company: "St. Paul's School", phone: "555-123-4567", openBalance: 0.00, action: "Create invoice" },
  { id: 9, name: "Football Awards Ceremony", company: "St. Paul's School:Football Awards Ceremony", phone: "", openBalance: 0.00, action: "Create invoice", isSub: true },
  { id: 10, name: "Yue Kim", company: "Yue Kim", phone: "517-123-0000", openBalance: 0.00, action: "Create invoice" },
];

export const INITIAL_SALES_TRANSACTIONS = [
  { id: 1, date: "9/29/25", type: "Invoice", no: "1037", customer: "Sonnenschein Family Store", memo: "", amount: 362.07, status: "Due in 2 days", action: "Receive payment" },
  { id: 2, date: "9/29/25", type: "Invoice", no: "1036", customer: "Freeman Sporting Goods:0969 Ocean View Road", memo: "", amount: 477.50, status: "Due in 2 days", action: "Receive payment" },
  { id: 3, date: "9/29/25", type: "Invoice", no: "1035", customer: "Mark Cho", memo: "", amount: 314.28, status: "Due in 2 days", action: "Receive payment" },
  { id: 4, date: "9/28/25", type: "Invoice", no: "1034", customer: "Rondonuwu Fruit and Vegi", memo: "", amount: 78.60, status: "Due tomorrow", action: "Receive payment" },
  { id: 5, date: "9/28/25", type: "Invoice", no: "1033", customer: "Geeta Kalapatapu", memo: "", amount: 629.10, status: "Due tomorrow", action: "Receive payment" },
  { id: 6, date: "9/27/25", type: "Invoice", no: "1023", customer: "Red Rock Diner", memo: "", amount: 70.00, status: "Due today", action: "Receive payment" },
];

export const INITIAL_EXPENSES = [
  { id: 1, date: "10/24/2025", type: "Credit Card Expense", no: "", payee: "", category: "Automobile", total: 34.00, action: "View/Edit" },
  { id: 2, date: "10/13/2025", type: "Credit Card Credit", no: "", payee: "", category: "Checking", total: -900.00, action: "View/Edit" },
  { id: 3, date: "10/11/2025", type: "Credit Card Expense", no: "", payee: "Squeaky Kleen Car Wash", category: "Automobile", total: 19.99, action: "View/Edit" },
  { id: 4, date: "10/05/2025", type: "Credit Card Expense", no: "", payee: "Hicks Hardware", category: "Job Expenses:Job Materials", total: 42.40, action: "View/Edit" },
  { id: 5, date: "10/04/2025", type: "Credit Card Expense", no: "", payee: "Squeaky Kleen Car Wash", category: "Automobile", total: 19.99, action: "View/Edit" },
  { id: 6, date: "10/04/2025", type: "Credit Card Expense", no: "", payee: "Bob's Burger Joint", category: "Meals and Entertainment", total: 18.97, action: "View/Edit" },
  { id: 7, date: "10/02/2025", type: "Cash Expense", no: "", payee: "Tania's Nursery", category: "Job Expenses:Job Materials", total: -23.50, action: "View/Edit" },
  { id: 8, date: "09/29/2025", type: "Expense", no: "76", payee: "Pam Seitz", category: "Legal & Professional Fees", total: 75.00, action: "View/Edit" },
  { id: 9, date: "09/29/2025", type: "Bill", no: "", payee: "Norton Lumber and Building Materials", category: "--Split--", total: 205.00, action: "Schedule payment" },
  { id: 10, date: "09/29/2025", type: "Purchase Order", no: "1004", payee: "Norton Lumber and Building Materials", category: "--Split--", total: 205.00, action: "Print" },
  { id: 11, date: "09/29/2025", type: "Expense", no: "1", payee: "Chin's Gas and Oil", category: "Automobile:Fuel", total: 52.56, action: "View/Edit" },
];

export const APP_MENU_ITEMS = [
  { id: "accounting", name: "Accounting", icon: "activity", pinned: true },
  { id: "expenses", name: "Expenses & Pay Bills", icon: "credit-card", pinned: true },
  { id: "sales", name: "Sales & Get Paid", icon: "bar-chart-2", pinned: true },
  { id: "customers", name: "Customer Hub", icon: "users", pinned: false },
  { id: "team", name: "Team", icon: "user-check", pinned: false },
  { id: "time", name: "Time", icon: "clock", pinned: false },
  { id: "projects", name: "Project Management", icon: "folder", pinned: false },
  { id: "inventory", name: "Inventory", icon: "package", pinned: false },
  { id: "salestax", name: "Sales Tax", icon: "percent", pinned: false },
  { id: "businesstax", name: "Business Tax", icon: "file-text", pinned: false },
  { id: "lending", name: "Lending", icon: "dollar-sign", pinned: false },
  { id: "marketing", name: "Marketing", icon: "sparkles", pinned: false, special: true },
];
