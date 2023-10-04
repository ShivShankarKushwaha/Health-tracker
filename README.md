# [Health Tracker](https://healthtracker-jwpl.onrender.com)
## Introduction
Welcome to the Health Tracker website! This web application is designed to help you monitor and improve your overall health and well-being. Whether you want to track your fitness progress, manage your diet, or stay on top of your medical appointments, this platform has got you covered.
## Features
### Personalized Dashboards:
Create your own customized dashboard with widgets for tracking your health metrics, fitness goals, and more.
### Fitness Tracking: 
Keep track of your workouts, set goals, and view your progress over time.
### Appointment Reminders:
Never miss a medical appointment again with our appointment reminder feature.
### Community Support: 
Connect with others on their health journeys through community forums and support groups.
### Mobile Compatibility: 
Access your health data and track your progress on the go with our mobile app.

## Getting Started
### Installation
Download this repository and run npm install
*(You have to add your own files such that)*
1. .env
2. Mail.js
3. config.json

sample data
1. .env
SESSION_SECRET = some_session_secret_text

2.  Mail.js
module.exports = {
  user: "YOUR_EMAIL",
  clientId: "YOUR_CLIENT_ID",
  clientSecret: "YOUR_CLIENT_SECRET",
  refreshToken: "REFRESH_TOKEN",
};

3. config.json
   {
  "google": {
    "web": {
      "client_id": "CLIENT_ID",
      "project_id": "PROJECT_ID",
      "auth_uri": "AUTH_URI",
      "token_uri": "TOKEN_URI",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_secret": "CLIENT_SECRET",
      "redirect_uris": ["REDIRECT_URI"],
      "javascript_origins": ["JS ORIGIN"]
    }
  }
}

Thank you for choosing Health Tracker! We hope this platform helps you on your journey to better health and well-being. If you have any questions or encounter any issues, please don't hesitate to contact us.
*(shivshankarkushwaha0000@gmail.com)*
