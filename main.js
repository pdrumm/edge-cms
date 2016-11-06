var edgeCMS = (function() {
  var edgeCMS = {};

  function loadScript(url, callback)
  {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;

    script.onreadystatechange = callback;
    script.onload = callback;

    head.appendChild(script);
  }

  function prepareFirebase() {
    var config = {
      apiKey: "AIzaSyBuWvVLmh4NGzfzsGBKIqmRsR9BtVJF1zE",
      authDomain: "edge-cms.firebaseapp.com",
      databaseURL: "https://edge-cms.firebaseio.com",
      storageBucket: "edge-cms.appspot.com",
      messagingSenderId: "1082973155115"
    };
    firebase.initializeApp(config);
  }

  function watchForUpdates() {
    var domain = getCurrentDomain();
    if (domain != "") {
      var ref = firebase.database().ref().child("domains").child(domain).child("values");
      var editableElements = document.getElementsByClassName("edge-cms");
      ref.once('value').then(function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
          for (i=0; i < editableElements.length; i++) {
            if (editableElements[i].getAttribute("data-key-name") === childSnapshot.key) {
              editableElements[i].innerHTML = childSnapshot.val();
            }
          }
        });
        document.body.style.opacity = 1;
      });
    } else {
      alert("Edge-CMS requires a valid domain name. Loading original HTML Values.");
      document.body.style.opacity = 1;
    }
  }

  function makeNotEditable() {
    if (editor != undefined) {
      editor.destroy();
    }
  }

  function removeSaveButton() {
    var button = document.getElementById("fixed-pos-button");
    if(button != undefined) {
      button.style.display = "none";
    }
  }

  var editor;
  function makeEditable() {
    if (editor === undefined) {
      var editableElements = document.getElementsByClassName("edge-cms");
      editor = new MediumEditor(editableElements, {
        toolbar: {
          buttons: ['bold', 'italic', 'underline', 'anchor']
        }
      });
    } else {
      editor.setup();
    }
  }

  var saveButton;
  function addSaveButton() {
    if (saveButton != undefined) {
      saveButton.style.display = "initial";
    } else {
      saveButton = document.createElement("button");
      saveButton.setAttribute("id", "fixed-pos-button");
      saveButton.innerHTML = "Save";
      saveButton.addEventListener("click", saveClicked);
      document.body.appendChild(saveButton);
    }
  }

  function saveClicked() {
    var domain = getCurrentDomain();
    var ref = firebase.database().ref().child("domains").child(domain).child("values");
    var editableElements = document.getElementsByClassName("edge-cms");
    for (i=0; i < editableElements.length; i++) {
      var keyName = editableElements[i].getAttribute("data-key-name");
      var dict = {};
      dict[keyName] = editableElements[i].innerHTML;
      ref.update(dict);
    }
    firebase.auth().signOut();
  }

  function getCurrentDomain() {
    return document.domain.replace(/\./g, "~");
  }

  var loginBtn;
  function addLoginButton() {
    if (loginBtn != undefined) {
      return;
    }
    loginBtn = document.createElement("button");
    loginBtn.innerHTML = "Log in";
    loginBtn.addEventListener("click", loginClicked);
    document.body.appendChild(loginBtn);
  }

  function loginClicked() {
    var loginModal = createLoginModal();
    document.body.appendChild(loginModal);
    loginModal.style.display = "block";
  }

  function canEditThisPage(user) {
    var domain = getCurrentDomain();
    var ref = firebase.database().ref().child("users/" + user.uid + "/domains");
    return ref.once('value').then(function(snapshot) {
      // check user permissions
      if (snapshot.exists()) {
        return snapshot.hasChild(domain);
      } else {
        return false;
      }
    }.then(function(userVerified) {
      if (!userVerified) {
        return false;
      }
      // check if page is still pending
      var pendingRef = firebase.database().ref().child("domains/" + domain + "/pending");
      return ref.once('value').then(function(snapshot) {
        return !snapshot.val()
      });
    });
  }

  function watchAuthState() {
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        canEditThisPage(user).then(function(canEdit) {
          if(canEdit) {
            console.log("User logged in");
            makeEditable();
            addSaveButton();
            var modal = document.getElementsByClassName("modal")[0];
            if (modal != undefined) {
              document.getElementsByClassName("modal")[0].style.display = "none";
            }
          } else {
            alert("You do not have the credentials to edit this page");
            firebase.auth().signOut();
          }
        });
      } else {
        // No user is signed in.
        console.log("No user logged in");
        makeNotEditable();
        removeSaveButton();
      }
    });
  }

  function firebaseReady() {
    prepareFirebase();
    watchAuthState();
    watchForUpdates();
    addLoginButton();
  }

  var loginForm;
  function createLoginForm() {
    if (loginForm != undefined) {
      return loginForm
    }
    loginForm = document.createElement("form");
    var emailLabel = document.createElement("label");
    var emailInput = document.createElement("input");
    var passwordLabel = document.createElement("label");
    var passwordInput = document.createElement("input");
    var submitBtn = document.createElement("button");

    emailInput.setAttribute("type", "email");
    emailInput.setAttribute("name", "email");
    emailInput.setAttribute("class", "edge-input");
    passwordInput.setAttribute("type", "password");
    passwordInput.setAttribute("name", "password");
    passwordInput.setAttribute("class", "edge-input");
    submitBtn.setAttribute("type", "submit");
    emailLabel.setAttribute("for", "email");
    passwordLabel.setAttribute("for", "password");

    emailLabel.innerHTML = "Email Address:";
    passwordLabel.innerHTML = "Password:";
    submitBtn.innerHTML = "Submit";

    loginForm.appendChild(emailLabel);
    loginForm.appendChild(emailInput);
    loginForm.appendChild(passwordLabel);
    loginForm.appendChild(passwordInput);
    loginForm.appendChild(submitBtn);

    loginForm.onsubmit = function() {
      var email = emailInput.value;
      var password = passwordInput.value;
      firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
        alert(error.message);
      });

      return false;
    };

    return loginForm;
  }

  var modalDiv;
  function createLoginModal() {
    if (modalDiv != undefined) {
      return modalDiv;
    }
    modalDiv = document.createElement("div");
    var contentDiv = document.createElement("div");
    var closeButton = document.createElement("span");
    var modalHeader = document.createElement("h3");
    var loginForm = createLoginForm();

    modalDiv.setAttribute("class", "modal");
    contentDiv.setAttribute("class", "modal-content");

    loginForm.style.marginTop = "20px";

    closeButton.innerHTML = "x";
    modalHeader.innerHTML = "Enter your login information";

    closeButton.addEventListener("click", function() {
      modalDiv.style.display = "none";
    });

    window.onclick = function(event) {
      if (event.target === modalDiv) {
        modalDiv.style.display = "none";
      }
    };

    contentDiv.appendChild(closeButton);
    contentDiv.appendChild(modalHeader);
    contentDiv.appendChild(loginForm);
    modalDiv.appendChild(contentDiv);

    return modalDiv;
  }

  edgeCMS.begin= function () {
    // add medium editor css and js files
    addStyleSheet("https://cdnjs.cloudflare.com/ajax/libs/medium-editor/5.22.1/css/medium-editor.css");
    addStyleSheet("https://cdnjs.cloudflare.com/ajax/libs/medium-editor/5.22.1/css/themes/flat.min.css");
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/medium-editor/5.22.1/js/medium-editor.js", function() {
      // Add firebase
      loadScript("https://www.gstatic.com/firebasejs/3.4.1/firebase.js", firebaseReady);
    });
  };

  function addStyleSheet(url) {
    var head  = document.getElementsByTagName('head')[0];
    var link  = document.createElement('link');
    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = url;
    head.appendChild(link);
  }

  return edgeCMS;
}());
