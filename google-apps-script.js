// =====================================================
// GOOGLE APPS SCRIPT - TEACHER FORM WEBHOOK
// =====================================================
// This script receives Google Form submissions and sends them to the ParentSaathi bot
//
// SETUP INSTRUCTIONS:
// 1. Open your Google Form
// 2. Click on the three dots menu > "Script editor"
// 3. Delete any existing code and paste this script
// 4. Update the WEBHOOK_URL below with your ngrok URL
// 5. Save the script
// 6. Click on the clock icon (Triggers) in the left sidebar
// 7. Click "+ Add Trigger" button
// 8. Set up trigger:
//    - Choose which function to run: onFormSubmit
//    - Choose which deployment should run: Head
//    - Select event source: From form
//    - Select event type: On form submit
// 9. Click Save and authorize the script
// =====================================================

// UPDATE THIS URL WHEN NGROK RESTARTS
const WEBHOOK_URL = 'https://cochleate-venetta-calculatory.ngrok-free.dev/api/form-webhook';

/**
 * This function runs automatically when a form is submitted
 * It's triggered by the "On form submit" trigger
 */
function onFormSubmit(e) {
  try {
    // Get the form response
    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();

    // Create an object to store the form data
    const formData = {};

    // Extract all form fields
    for (let i = 0; i < itemResponses.length; i++) {
      const itemResponse = itemResponses[i];
      const question = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();

      // Map form questions to expected field names
      // Adjust these mappings based on your actual form questions
      if (question.toLowerCase().includes('teacher') && question.toLowerCase().includes('name')) {
        formData.teacher_name = answer;
      } else if (question.toLowerCase().includes('subject')) {
        formData.subject = answer;
      } else if (question.toLowerCase().includes('class')) {
        formData.class = answer;
      } else if (question.toLowerCase().includes('chapter')) {
        formData.chapter = answer;
      } else if (question.toLowerCase().includes('explain') || question.toLowerCase().includes('method')) {
        formData.explanation = answer;
      } else if (question.toLowerCase().includes('example')) {
        formData.example = answer;
      } else if (question.toLowerCase().includes('mistake')) {
        formData.mistakes = answer;
      } else if (question.toLowerCase().includes('tip')) {
        formData.tips = answer;
      }
    }

    // Add timestamp
    formData.timestamp = new Date().toISOString();

    // Send data to the bot webhook
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(formData),
      'muteHttpExceptions': true
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    // Log the result
    Logger.log('Webhook response code: ' + responseCode);
    Logger.log('Webhook response: ' + responseText);

    if (responseCode === 200) {
      Logger.log('Successfully sent form data to ParentSaathi bot');
    } else {
      Logger.log('Error sending form data. Status: ' + responseCode);
    }

  } catch (error) {
    Logger.log('Error in onFormSubmit: ' + error.toString());

    // Optionally, send error notification email
    // MailApp.sendEmail('your-email@example.com', 'Form Webhook Error', error.toString());
  }
}

/**
 * Test function - Run this manually to test the webhook
 * This sends sample data to verify the connection works
 */
function testWebhook() {
  const testData = {
    teacher_name: 'Mrs. Test Teacher',
    subject: 'Mathematics',
    class: '8',
    chapter: 'Fractions',
    explanation: 'I explain fractions using pizza slices. If you have 1 pizza cut into 4 slices and eat 1, you ate 1/4 of the pizza.',
    example: 'Pizza slices, chocolate bars, and sharing food are great real-life examples',
    mistakes: 'Students often confuse numerator and denominator',
    tips: 'Always use visual aids and real objects when teaching fractions',
    timestamp: new Date().toISOString()
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(testData),
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log('Test webhook response code: ' + responseCode);
    Logger.log('Test webhook response: ' + responseText);

    if (responseCode === 200) {
      Logger.log('✅ Webhook test successful!');
    } else {
      Logger.log('❌ Webhook test failed. Status: ' + responseCode);
    }
  } catch (error) {
    Logger.log('❌ Error testing webhook: ' + error.toString());
  }
}

/**
 * Utility function to get the current webhook URL
 * Useful when you need to update the URL after ngrok restarts
 */
function getWebhookUrl() {
  Logger.log('Current webhook URL: ' + WEBHOOK_URL);
  return WEBHOOK_URL;
}

// =====================================================
// ALTERNATIVE: WEB APP ENDPOINT (if you need it)
// =====================================================
// If you want to expose this as a web app that can receive
// data from other sources (not just form submissions)

/**
 * Handle POST requests to the web app
 * Deploy as: Web app > Execute as: Me > Who has access: Anyone
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Forward to the bot
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(data),
      'muteHttpExceptions': true
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);

    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'success',
        'message': 'Data forwarded to bot'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'error',
        'message': error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests to the web app (for testing)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      'status': 'ParentSaathi Form Webhook is running',
      'webhook_url': WEBHOOK_URL,
      'timestamp': new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
