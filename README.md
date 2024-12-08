# ReqMail 

ReqMail is a groundbreaking platform that simplifies cryptocurrency transactions for everyone, including non-crypto organizations. By using a familiar tool—**email**—ReqMail enables users to perform blockchain actions like creating requests, transferring assets, and generating invoices, all with minimal effort and no need for prior blockchain expertise.  

ReqMail is powered by [Request Network](https://request.network/), Web3Auth, and advanced email processing tools to create a seamless and secure experience for managing digital assets.  

## Project Links
- **BUIDL Submission**: [ReqMail on DoraHacks](https://dorahacks.io/buidl/20598)  
- **Frontend Repository**: [ReqMail Frontend GitHub](https://github.com/ReqMail/Frontend)

---

## Features
- **Easy Authentication**: Users authenticate securely through Web3Auth using their email.
- **Email-based Commands**: Perform actions like asset transfers and swaps by sending simple email commands.
- **Automated Invoice Generation**: Automatically create and email invoices in PDF format after completing transactions.
- **Non-Crypto Organization-Friendly**: Perfect for businesses without blockchain expertise to manage crypto payments easily.
- **Secure and Transparent**: Blockchain-based transactions with robust wallet management.

---

## Workflow Diagram

The flowchart below illustrates the ReqMail workflow, from user authentication to email-based commands and transaction completion:

```mermaid
flowchart TD
    U1["<div style='font-size:24px;'>👤 <b>User1</b></div><br><b>Step 1:</b> User1 authenticates with ReqMail"]:::node 
    -->|<b>Step 2:</b> Authenticates through ReqMail Platform| RM["<div style='font-size:24px;'>🌐 <b>ReqMail Platform</b></div>"]:::node
    RM -->|<b>Step 3:</b> Authenticates via Web3Auth| DB["<div style='font-size:24px;'>💾 <b>Database</b></div><br><b>Stores email and wallet data</b>"]:::node
    U2["<div style='font-size:24px;'>👤 <b>User2</b></div><br><b>Step 4:</b> User2 authenticates with ReqMail"]:::node 
    -->|<b>Step 5:</b> Authenticates via Web3Auth| DB
    U1 -->|<b>Step 6:</b> Sends Email Command| G["<div style='font-size:24px;'>📧 <b>ReqMail12@gmail</b></div><br><b>Email received by ReqMail</b>"]:::node
    G -->|<b>Step 7:</b> Fetches Unread Emails via IMAP| NLP["<div style='font-size:24px;'>🧠 <b>NLP Processing</b></div><br><b>Processes command</b>"]:::node
    NLP -->|<b>Step 8:</b> Command Interpretation Swap/Transfer| RN["<div style='font-size:24px;'>💱 <b>Request Network</b></div>"]:::node
    RN -->|<b>Step 9:</b> Creates Payment Request| BC["<div style='font-size:24px;'>⛓️ <b>Blockchain</b></div><br><b>Transaction processed</b>"]:::node
    BC -->|<b>Step 10:</b> Confirms Transaction| RN
    RN -->|<b>Step 11:</b> Pays Request to User2| U2
    RN -->|<b>Step 12:</b> Generates Invoice PDF| PDF["<div style='font-size:24px;'>📄 <b>Invoice PDF</b></div>"]:::node
    PDF -->|<b>Step 13:</b> Sends Invoice Email| U1

    classDef node fill:#6C63FF,stroke:#333,stroke-width:2px,color:#FFF,font-size:16px,text-align:center;
