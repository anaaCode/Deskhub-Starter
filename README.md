# 🚀 Deskhub Starter

A lightweight Help Desk / Ticket Management application built using **HTML, CSS, and JavaScript**. The project demonstrates client-side routing, ticket management, authentication flow, API integration, form validation, local storage usage, and modern JavaScript development practices.

## 🌐 Live Demo

👉 [Deskhub Starter](https://anaacode.github.io/Deskhub-Starter/)


---

## 📖 Overview

Deskhub Starter is a simple ticket management system that allows users to:

* Login to the application
* View all support tickets
* Create new tickets
* View ticket details
* Update ticket information
* Manage ticket status and priority
* Interact with a mock REST API
* Experience responsive and user-friendly interfaces

---

## ✨ Features

### Authentication

* User login flow
* Session persistence using Local Storage
* Route protection

### Ticket Management

* View all tickets
* Create new tickets
* Edit existing tickets
* View detailed ticket information
* Ticket status tracking
* Priority management

### UI Features

* Responsive design
* Loading indicators
* Toast notifications
* Form validation
* Reusable UI components

### Utilities

* Debounce implementation
* Date formatting with Intl APIs
* Local Storage wrapper utilities

---

## 🛠️ Tech Stack

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript (ES6+)

### Development Tools

* JSON Server
* Git
* GitHub Pages

---

## 📂 Project Structure

```text
deskhub-starter/
├── package.json
├── db.json
├── README.md
├── PROJECT_GUIDE.md
├── public/
│   ├── index.html
│   ├── dashboard.html
│   ├── tickets.html
│   └── ticket-detail.html
│
└── src/
    ├── styles/
    │   └── main.css
    │
    ├── main.js
    │
    ├── api/
    │   ├── client.js
    │   ├── tickets.js
    │   └── auth.js
    │
    ├── modules/
    │   ├── auth.js
    │   ├── tickets.js
    │   ├── ticketDetail.js
    │   ├── form.js
    │   └── ui.js
    │
    └── utils/
        ├── debounce.js
        ├── formatDate.js
        └── storage.js
```

---

## ⚙️ Installation

### Clone the Repository

```bash
git clone https://github.com/anaacode/Deskhub-Starter.git
```

### Navigate to the Project

```bash
cd Deskhub-Starter
```

### Install Dependencies

```bash
npm install
```

### Start JSON Server

```bash
npx json-server --watch db.json --port 3000
```

### Launch the Application

Open:

```text
public/index.html
```

using Live Server or your preferred local server.

---

## 📋 Learning Concepts Covered

* ES Modules
* Async / Await
* Fetch API
* CRUD Operations
* Event Delegation
* Form Validation
* Local Storage
* Debouncing
* Modular JavaScript Architecture
* Responsive UI Development

---

## 🎯 Future Improvements

* Search and filter tickets
* Pagination
* Dark mode
* User profile management
* Role-based access control
* Backend integration
* Real authentication system

---





GitHub: https://github.com/anaacode

---

## 📄 License

This project is created for learning and educational purposes.
