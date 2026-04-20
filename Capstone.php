<?php
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lokal Vibe</title>
  <link rel="stylesheet" href="Style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="Lokal.png" alt="Lokal Vibe Logo">
    </div>
    <button class="btn" id="travelBtn">Lets travel!</button>
  </div>

  <div id="popup" class="popup">
    <div class="popup-content">
      <img src="Lokal.png" alt="Popup Logo" class="popup-logo">
      <h2>Continue your journey</h2>
      <button class="popup-btn" id ="guestBttn">Continue as Guest</button>
      <button class="popup-btn" id ="createBttn">Create an Account</button>
      <button class="popup-btn" id ="loginBttn">Log In</button>
      <span class="close" id="closeBtn">&times;</span>
    </div>
  </div>

  <!-- Account Type Selection Popup -->
<div id="accountTypePopup" class="popup">
  <div class="popup-content">
    <h2 class="popup-title">Account as?</h2>
    <button class="popup-btn account-type" data-type="tourist">A Tourist</button>
    <button class="popup-btn account-type" data-type="lgu">An LGU</button>
    <button class="popup-btn account-type" data-type="vendor">A Vendor</button>
    <span class="close" id="closeAccountType">&times;</span>
  </div>
</div>

<!-- Create Account Popup -->
<div id="createPopup" class="popup">
  <div class="popup-content">
    <h2 class="popup-title">Register</h2>

    <form id="registerForm">
      <input type="text" name="full_name" placeholder="Full Name" required>
      <input type="email" name="email" placeholder="E-mail" required>
      <input type="text" name="phone" placeholder="Phone" required>

      <div class="password-container">
        <input type="password" id="password" name="password" placeholder="Password" required>
        <i class="fa-solid fa-eye toggle-password" data-target="password"></i>
      </div>

      <div class="password-container">
        <input type="password" id="confirmPassword" name="confirm_password" placeholder="Confirm Password" required>
        <i class="fa-solid fa-eye toggle-password" data-target="confirmPassword"></i>
      </div>

      <button type="submit" class="popup-btn register-btn">Register</button>
    </form>

    <button type="button" class="popup-btn login-switch">Have account? Sign In</button>
    <span class="close" id="closeCreate">&times;</span>
    <span class="back" id="backToAccountType">&#8592;</span>
  </div>
</div>

<div id="loginPopup" class="popup">
  <div class="popup-content">
    <span class="close" id="closeLogin">&times;</span>
    <h2>Login</h2>
    <form id="loginForm">
      <input type="email" name="email" placeholder="E-mail" required>
      <div class="password-container">
        <input type="password" id="loginPassword" name="password" placeholder="Password" required>
        <i class="fa-solid fa-eye toggle-password" data-target="loginPassword"></i>
      </div>
      <button type="submit" class="popup-btn">LOGIN</button>
    </form>
  </div>
</div>

  <script src="./CapJs.js"></script>

</body>
</html>