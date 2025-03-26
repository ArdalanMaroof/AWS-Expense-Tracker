# AWS-Expense-Tracker  

## Section 1: Project Description

### 1.1 Project

Expense Tracker on AWS

### 1.2 Description

The Expense Tracker project is designed to help users seamlessly manage their expenses, set budgets, and visualize financial trends. By leveraging AWS services, the application ensures scalability, security, and high availability. Users can add transactions, categorize expenses, set budgets, and receive alerts when exceeding their budget limits.

### 1.3 Revision History
![Table Screenshot](Revision-Hestory.png)

## Section 2: Overview

### 2.1 Purpose

The purpose of this module is to provide an intuitive and user-friendly interface for tracking expenses, analyzing financial trends, and managing budgets. This module is intended for individual users seeking a personal finance management tool.

### 2.2 Scope

#### Included Features:

- Secure user authentication using AWS Cognito

- Expense management: Add, update, delete, and categorize expenses

- Budget tracking: Set monthly limits and track expenses

- Data visualization: LiveCharts for financial trends

- Cloud storage: AWS DynamoDB for storing data

- Cloud monitoring: AWS CloudWatch for performance tracking

#### Excluded Features:

- Multi-currency support

- AI-based financial recommendations

- Third-party authentication (Google/Facebook login)

- Multi-user collaboration


### 2.3 Requirements

#### 2.3.1 Functional Requirements

- Users can securely log in to their accounts.

- Users can input and categorize expenses.

- The system shall notify users when budget limits are exceeded.

- Expenses are displayed using LiveCharts for visualization.


#### 2.3.2 Non-Functional Requirements

- The system shall be highly scalable using AWS services.

- The application shall have 99.9% uptime.

- Secure data encryption for all stored and transmitted data.

2.3.3 Technical Requirements

Backend hosted on AWS EC2

Data stored in AWS DynamoDB

UI developed with WPF using .NET Core

API security managed via AWS API Gateway

2.3.4 Security Requirements

AWS Cognito for authentication

AWS API Gateway for secure API access

IAM roles for minimal privilege access
