#!/bin/bash
# Simplified MANUAL-STEPS.html template - ONLY manual steps

PROJECT_NAME="$1"
NEXTJS_PORT="$2"
STAGING_URL="$3"
PRODUCTION_URL="$4"

cat > MANUAL-STEPS.html <<'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PROJECT_NAME - Setup Instructions</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 40px 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 { color: #1a1a1a; margin-bottom: 10px; }
        .subtitle { color: #6b7280; margin-bottom: 30px; }
        .step {
            background: #f9fafb;
            padding: 25px;
            margin: 25px 0;
            border-radius: 8px;
            border-left: 5px solid #3b82f6;
        }
        .step-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        .step-num {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #3b82f6;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            font-weight: bold;
            font-size: 1.2em;
            margin-right: 15px;
        }
        .step-title {
            font-size: 1.5em;
            font-weight: 600;
            color: #1f2937;
        }
        .copy-box {
            position: relative;
            margin: 15px 0;
        }
        .copy-box label {
            display: block;
            font-size: 0.9em;
            color: #6b7280;
            margin-bottom: 5px;
            font-weight: 500;
        }
        .copy-content {
            background: #1f2937;
            color: #e5e7eb;
            padding: 15px;
            border-radius: 6px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .copy-content code {
            flex: 1;
            word-break: break-all;
        }
        .copy-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
            margin-left: 15px;
            white-space: nowrap;
            transition: background 0.2s;
            font-weight: 500;
        }
        .copy-btn:hover { background: #2563eb; }
        .copy-btn.copied { background: #10b981; }
        .note {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px 20px;
            margin: 15px 0;
            border-radius: 4px;
        }
        .success {
            background: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 15px 20px;
            margin: 15px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>PROJECT_NAME - Manual Setup</h1>
        <div class="subtitle">Complete these 2 steps to finish setup</div>

        <div class="note">
            <strong>Good news!</strong> The script already did most of the work. These are the only manual steps left.
        </div>

        <!-- Step 1: Add to /etc/hosts -->
        <div class="step">
            <div class="step-header">
                <div class="step-num">1</div>
                <div class="step-title">Add Domain to /etc/hosts</div>
            </div>
            <p>Run this command in your terminal:</p>
            <div class="copy-box">
                <div class="copy-content">
                    <code>echo '127.0.0.1 PROJECT_NAME.local' | sudo tee -a /etc/hosts</code>
                    <button class="copy-btn" onclick="copy(this, 'echo \'127.0.0.1 PROJECT_NAME.local\' | sudo tee -a /etc/hosts')">Copy</button>
                </div>
            </div>
        </div>

        <!-- Step 2: Update Google OAuth -->
        <div class="step">
            <div class="step-header">
                <div class="step-num">2</div>
                <div class="step-title">Update Google OAuth Redirect URIs</div>
            </div>

            <ol style="margin-left: 20px; margin-bottom: 15px;">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: #2563eb; font-weight: 600;">Google Cloud Console → Credentials</a></li>
                <li>Click on your OAuth 2.0 Client ID (the one you created earlier)</li>
                <li>Scroll down to "<strong>Authorized redirect URIs</strong>"</li>
                <li>Click "<strong>+ ADD URI</strong>" button</li>
                <li>Add each of the 3 URIs below (click the copy button for each one):</li>
            </ol>

            <div class="copy-box">
                <label>Local (port NEXTJS_PORT):</label>
                <div class="copy-content">
                    <code>http://localhost:NEXTJS_PORT/api/auth/callback/google</code>
                    <button class="copy-btn" onclick="copy(this, 'http://localhost:NEXTJS_PORT/api/auth/callback/google')">Copy</button>
                </div>
            </div>

            <div class="copy-box">
                <label>Staging:</label>
                <div class="copy-content">
                    <code>STAGING_URL/api/auth/callback/google</code>
                    <button class="copy-btn" onclick="copy(this, 'STAGING_URL/api/auth/callback/google')">Copy</button>
                </div>
            </div>

            <div class="copy-box">
                <label>Production:</label>
                <div class="copy-content">
                    <code>PRODUCTION_URL/api/auth/callback/google</code>
                    <button class="copy-btn" onclick="copy(this, 'PRODUCTION_URL/api/auth/callback/google')">Copy</button>
                </div>
            </div>

            <ol style="margin-left: 20px; margin-top: 15px;" start="6">
                <li>Click "<strong>SAVE</strong>" at the bottom of the page</li>
            </ol>
        </div>

        <div class="success" style="margin-top: 40px;">
            <h2 style="margin-top: 0; color: #065f46;">That's it!</h2>
            <p>Once you complete Step 2, your app is ready. It's already deployed and running at:</p>
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li><strong>Local:</strong> http://PROJECT_NAME.local</li>
                <li><strong>Staging:</strong> STAGING_URL</li>
                <li><strong>Production:</strong> PRODUCTION_URL</li>
            </ul>
        </div>
    </div>

    <script>
        function copy(button, text) {
            navigator.clipboard.writeText(text).then(() => {
                button.textContent = 'Copied!';
                button.classList.add('copied');
                setTimeout(() => {
                    button.textContent = 'Copy';
                    button.classList.remove('copied');
                }, 2000);
            });
        }
    </script>
</body>
</html>
HTMLEOF

# Replace placeholders
sed -i '' "s/PROJECT_NAME/$PROJECT_NAME/g" MANUAL-STEPS.html
sed -i '' "s/NEXTJS_PORT/$NEXTJS_PORT/g" MANUAL-STEPS.html
sed -i '' "s|STAGING_URL|$STAGING_URL|g" MANUAL-STEPS.html
sed -i '' "s|PRODUCTION_URL|$PRODUCTION_URL|g" MANUAL-STEPS.html

echo "Generated MANUAL-STEPS.html"
