document.addEventListener("DOMContentLoaded", () => {

  // =======================
  // MAIN POPUP
  // =======================
  const openPopup = document.getElementById("travelBtn");
  const closePopup = document.getElementById("closeBtn");
  const popup = document.getElementById("popup");

  openPopup.addEventListener("click", () => popup.classList.add("show"));
  closePopup.addEventListener("click", () => popup.classList.remove("show"));

  popup.addEventListener("click", (e) => {
    if (e.target === popup) popup.classList.remove("show");
  });


// Continue as Guest
// Continue as Guest
document.getElementById("guestBttn").addEventListener("click", () => {
  // go to a small PHP bridge that sets the guest session and redirects to Main.php
  window.location.href = "guest.php";
});




  // =======================
  // CREATE ACCOUNT POPUP
  // =======================
  const createBtn = document.getElementById("createBttn");
  const createPopup = document.getElementById("createPopup");
  const closeCreate = document.getElementById("closeCreate");

  const accountTypePopup = document.getElementById("accountTypePopup");
  const closeAccountType = document.getElementById("closeAccountType");
  const backToAccountType = document.getElementById("backToAccountType");
  const registerForm = document.getElementById("registerForm");

  // Show account type first
  createBtn.addEventListener("click", () => {
    popup.classList.remove("show");
    accountTypePopup.classList.add("show");
  });

  closeAccountType.addEventListener("click", () => {
    accountTypePopup.classList.remove("show");
  });

  accountTypePopup.addEventListener("click", (e) => {
    if (e.target === accountTypePopup) accountTypePopup.classList.remove("show");
  });

  // account type selection
  document.querySelectorAll(".account-type").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-type");

      registerForm.setAttribute("data-account-type", type);

      accountTypePopup.classList.remove("show");
      createPopup.classList.add("show");
    });
  });

  backToAccountType.addEventListener("click", () => {
    createPopup.classList.remove("show");
    accountTypePopup.classList.add("show");
  });

  // Register form
  registerForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const formData = new FormData(registerForm);

    const accountType = registerForm.getAttribute("data-account-type");
    formData.append("account_type", accountType);

    fetch("createUsers.php", {
      method: "POST",
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        alert(data.message);

        if (data.status === "success") {
          createPopup.classList.remove("show");
          clearPopupInputs(createPopup);
        }
      })
      .catch(error => console.error(error));
  });

  const loginSwitch = document.querySelector(".login-switch");

loginSwitch.addEventListener("click", () => {
    createPopup.classList.remove("show");     // close register popup
    accountTypePopup.classList.remove("show"); // ensure account popup hidden

    // Open login choice popup
    loginChoicePopup.classList.add("show");

    // Clear the form fields (optional)
    clearPopupInputs(createPopup);
});

closeCreate.addEventListener("click", () => {
    createPopup.classList.remove("show");  // hide popup
    clearPopupInputs(createPopup);         // clear inputs
    accountTypePopup.classList.remove("show");
});


  // =======================
  // LOGIN CHOICE POPUP
  // =======================
  const loginBtn = document.getElementById("loginBttn");
  const loginChoicePopup = document.getElementById("loginChoicePopup");
  const loginTypeButtons = document.querySelectorAll(".login-type");
  const closeLoginChoice = document.getElementById("closeLoginChoice");

  const loginPopup = document.getElementById("loginPopup");
  const closeLogin = document.getElementById("closeLogin");
  const loginTypeInput = document.getElementById("loginTypeInput");

  // Open Login Choice
  loginBtn.addEventListener("click", () => {
    popup.classList.remove("show");
    loginChoicePopup.classList.add("show");
  });

  // Login choice → login form
  loginTypeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      loginTypeInput.value = btn.getAttribute("data-type");
      loginChoicePopup.classList.remove("show");
      loginPopup.classList.add("show");
    });
  });

  closeLoginChoice.addEventListener("click", () => {
    loginChoicePopup.classList.remove("show");
  });

  loginChoicePopup.addEventListener("click", (e) => {
    if (e.target === loginChoicePopup) loginChoicePopup.classList.remove("show");
  });


  // =======================
  // LOGIN POPUP
  // =======================
  closeLogin.addEventListener("click", () => {
    loginPopup.classList.remove("show");
    clearPopupInputs(loginPopup);
  });

  loginPopup.addEventListener("click", (e) => {
    if (e.target === loginPopup) {
      loginPopup.classList.remove("show");
      clearPopupInputs(loginPopup);
    }
  });


  // =======================
  // LOGIN FORM SUBMIT
  // =======================
  const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const formData = new FormData(loginForm);
    formData.append("login_type", loginTypeInput.value); // send selected login type

    fetch("loginUsers.php", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {
            alert(data.message);
            loginPopup.classList.remove("show");
            clearPopupInputs(loginPopup);

            // 🔥 Redirect based on account type
            switch(data.account_type) {
                case "tourist":
                    window.location.href = "Main.php";
                    break;
                case "lgu":
                    window.location.href = "Org.php";
                    break;
                case "vendor":
                    window.location.href = "vendor.php";
                    break;
                default:
                    window.location.href = "Main.php";
            }

        } else {
            alert(data.message);
        }
    })
    .catch(error => console.error(error));
});


  // =======================
  // PASSWORD TOGGLE EYES
  // =======================
  document.querySelectorAll(".toggle-password").forEach(icon => {
    icon.addEventListener("click", () => {
      const input = document.getElementById(icon.getAttribute("data-target"));

      if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }
    });
  });


  // =======================
  // CLEAR POPUP INPUTS
  // =======================
  function clearPopupInputs(popup) {
    popup.querySelectorAll("input").forEach(input => input.value = "");
  }

});
