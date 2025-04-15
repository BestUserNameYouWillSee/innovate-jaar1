// Pagina elementen
const pages = {
  home: document.getElementById("homePage"),
  login: document.getElementById("loginPage"),
  loginVerification: document.getElementById("loginVerificationPage"),
  register: document.getElementById("registerPage"),
  hashing: document.getElementById("hashingPage"),
};

// Initialiseer de applicatie
document.addEventListener("DOMContentLoaded", function () {
  setupEventListeners();
  addAnimationStyles();
});

// Voeg CSS-stijlen toe voor animaties
function addAnimationStyles() {
  if (!document.getElementById("animation-styles")) {
    const styleElement = document.createElement("style");
    styleElement.id = "animation-styles";

    styleElement.textContent = `
      .database-visualization {
        margin: 15px 0;
        border: 1px solid #ddd;
        border-radius: 5px;
        overflow: hidden;
      }
      
      .database-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .table-header {
        display: flex;
        background-color: #f0f0f0;
        font-weight: bold;
        border-bottom: 2px solid #ddd;
      }
      
      .table-row {
        display: flex;
        border-bottom: 1px solid #eee;
      }
      
      .table-cell {
        flex: 1;
        padding: 10px;
        border-right: 1px solid #eee;
        overflow: hidden;
      }
      
      .hash-display {
        word-break: break-all;
        font-family: monospace;
        font-size: 0.9em;
        background: #f5f5f5;
        padding: 5px;
        border-radius: 3px;
      }
      
      .new-row {
        background-color: #e6ffe6;
        animation: highlight-row 2s ease-in-out;
      }
      
      @keyframes highlight-row {
        0% { background-color: #ffffff; }
        50% { background-color: #e6ffe6; }
        100% { background-color: #f5f5f5; }
      }
      
      .comparison-container {
        display: flex;
        gap: 20px;
        margin-bottom: 15px;
      }
      
      .comparison-item {
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 5px;
      }
      
      .loader {
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px auto;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .result-container {
        text-align: center;
        padding: 15px;
      }
      
      .match-highlight {
        background-color: #dff0d8;
        color: #3c763d;
        padding: 3px;
        border-radius: 3px;
        animation: pulse 1s infinite;
      }
      
      .no-match-highlight {
        background-color: #f2dede;
        color: #a94442;
        padding: 3px;
        border-radius: 3px;
      }
      
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }
    `;

    document.head.appendChild(styleElement);
  }
}

// Toon een specifieke pagina
function showPage(page) {
  Object.values(pages).forEach((p) => p.classList.remove("active"));
  pages[page].classList.add("active");
  window.scrollTo(0, 0);
}

// Toon een foutmelding
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.style.display = "block";
  setTimeout(() => {
    element.style.display = "none";
  }, 5000);
}

// Toon een succesmelding
function showSuccess(elementId, message) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.style.display = "block";
  setTimeout(() => {
    element.style.display = "none";
  }, 5000);
}

// Helper functie voor vertraging
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Update progress bar
function updateProgress(barId, percent, text = "") {
  const bar = document.getElementById(barId);
  bar.style.width = `${percent}%`;
  bar.textContent = text || `${percent}%`;
}

// Zet alle event listeners op
function setupEventListeners() {
  // Navigatie knoppen
  document
    .getElementById("loginBtn")
    .addEventListener("click", () => showPage("login"));
  document
    .getElementById("registerBtn")
    .addEventListener("click", () => showPage("register"));
  document
    .getElementById("backToHomeFromLogin")
    .addEventListener("click", () => showPage("home"));
  document
    .getElementById("backToHomeFromRegister")
    .addEventListener("click", () => {
      resetDatabaseVisualization();
      showPage("home");
    });
  document
    .getElementById("goToLoginAfterRegister")
    .addEventListener("click", () => {
      resetDatabaseVisualization();
      showPage("login");
    });
  // Terug knop na inlog verificatie
  document
    .getElementById("afterLoginVerification")
    .addEventListener("click", () => showPage("login"));

  // Registratie proces
  document
    .getElementById("doRegister")
    .addEventListener("click", async function () {
      resetDatabaseVisualization();

      const name = document.getElementById("registerName").value;
      const email = document.getElementById("registerEmail").value;
      const password = document.getElementById("registerPassword").value;
      const passwordConfirm = document.getElementById(
        "registerPasswordConfirm"
      ).value;

      // Validatie
      if (!name || !email || !password || !passwordConfirm) {
        return showError("registerError", "Vul alle velden in");
      }

      if (password !== passwordConfirm) {
        return showError("registerError", "Wachtwoorden komen niet overeen");
      }

      if (password.length < 8) {
        return showError(
          "registerError",
          "Wachtwoord moet minimaal 8 tekens zijn"
        );
      }

      showPage("hashing");

      try {
        await animateSaltGeneration();
        await animateHashCalculation();

        // Toon de echte hash
        const hashResponse = await fetch("/hash-demo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        });
        const hashData = await hashResponse.json();

        document.getElementById(
          "saltOutput"
        ).textContent = `Salt: ${hashData.salt}`;
        document.getElementById("hashOutput").textContent = hashData.hash;
        document.getElementById("hashingSuccess").style.display = "block";

        // Animeer database opslag met echte waarden
        await animateDatabaseStorage(name, email, hashData.hash, hashData.salt);

        // Registreer de gebruiker
        const formData = new FormData();
        formData.append("name", name);
        formData.append("email", email);
        formData.append("password", password);
        formData.append("password_confirm", passwordConfirm);

        const response = await fetch("/register", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!result.success) {
          showPage("register");
          showError("registerError", result.message);
        }
      } catch (error) {
        console.error("Registratiefout:", error);
        showPage("register");
        showError("registerError", "Er ging iets mis bij de registratie");
      }
    });

  // Inlog proces
  document
    .getElementById("doLogin")
    .addEventListener("click", async function () {
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      if (!email || !password) {
        return showError("loginError", "Vul alle velden in");
      }

      showPage("loginVerification");
      const success = await animateLoginVerification(email, password);

      if (success) {
        document.getElementById("afterLoginVerification").style.display =
          "block";
      } else {
        await delay(3000);
        showPage("login");
        showError("loginError", "Ongeldige inloggegevens");
      }
    });
}

// Animeer salt generatie
async function animateSaltGeneration() {
  updateProgress("saltProgressBar", 10, "Salt genereren...");
  await delay(300);
  updateProgress(
    "saltProgressBar",
    50,
    "Crypto-secure random waarden maken..."
  );
  await delay(300);
  updateProgress("saltProgressBar", 100, "Salt genereren voltooid");
  await delay(300);
}

// Animeer hash berekening
async function animateHashCalculation() {
  updateProgress("hashProgressBar", 10, "Starten van Argon2id...");
  await delay(300);
  updateProgress("hashProgressBar", 30, "Memory alloceren (64MB)...");
  await delay(500);
  updateProgress("hashProgressBar", 50, "Hash berekenen...");
  await delay(800);
  updateProgress("hashProgressBar", 70, "Iteraties uitvoeren...");
  await delay(500);
  updateProgress("hashProgressBar", 90, "Finaliseren...");
  await delay(300);
  updateProgress("hashProgressBar", 100, "Hashing voltooid!");
  await delay(300);
}

// Animeer database opslag met echte hash
async function animateDatabaseStorage(name, email, fullHash, salt) {
  document.getElementById("newUserRow").innerHTML = "";
  document.getElementById("newSaltRow").innerHTML = "";

  const userRow = document.getElementById("newUserRow");
  userRow.innerHTML = `
    <div class="table-cell">AUTO</div>
    <div class="table-cell">${name}</div>
    <div class="table-cell">${email}</div>
    <div class="table-cell hash-display">${fullHash}</div>
  `;

  const saltRow = document.getElementById("newSaltRow");
  saltRow.innerHTML = `
    <div class="table-cell">AUTO</div>
    <div class="table-cell">AUTO</div>
    <div class="table-cell hash-display">${salt}</div>
  `;

  updateProgress("dbStorageProgressBar", 10, "Verbinden met database...");
  await delay(300);
  updateProgress("dbStorageProgressBar", 30, "Transactie starten...");
  await delay(300);
  updateProgress("dbStorageProgressBar", 60, "Gebruiker opslaan...");
  await delay(500);
  updateProgress(
    "dbStorageProgressBar",
    80,
    `Opslaan hash: ${fullHash.substring(0, 20)}...`
  );
  await delay(300);
  updateProgress("dbStorageProgressBar", 100, "Transactie voltooid!");
}

function resetDatabaseVisualization() {
  document.getElementById("newUserRow").innerHTML = "";
  document.getElementById("newSaltRow").innerHTML = "";
  document.getElementById("saltOutput").textContent =
    "Bezig met genereren van cryptografische salt...";
  document.getElementById("hashOutput").textContent = "";
  document.getElementById("hashingSuccess").style.display = "none";
  updateProgress("saltProgressBar", 0);
  updateProgress("hashProgressBar", 0);
  updateProgress("dbStorageProgressBar", 0);
}

// Animeer login verificatie met echte hash
async function animateLoginVerification(email, password) {
  try {
    document.getElementById("loginUserRow").innerHTML = "";
    document.getElementById("storedHashDisplay").textContent = "Laden...";
    document.getElementById("inputHashDisplay").textContent = "Berekenen...";
    document.getElementById("loginVerificationResult").innerHTML = `
      <div class="loader"></div>
      <p>Verificatie uitvoeren...</p>
    `;
    document.getElementById("afterLoginVerification").style.display = "none";
    updateProgress("userLookupProgressBar", 0, "0%");
    updateProgress("verificationProgressBar", 0, "0%");

    updateProgress("userLookupProgressBar", 20, "Database query uitvoeren...");
    await delay(500);
    updateProgress("userLookupProgressBar", 50, "Gebruiker zoeken...");
    await delay(400);

    const loginResponse = await fetch("/test-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const loginResult = await loginResponse.json();

    if (!loginResult.success) {
      updateProgress("userLookupProgressBar", 100, "Gebruiker niet gevonden");
      document.getElementById("loginUserRow").innerHTML = `
        <div class="table-cell" colspan="4" style="text-align: center; color: red;">
          Geen records gevonden voor ${email}
        </div>
      `;

      document.getElementById("loginVerificationResult").innerHTML = `
        <div class="no-match-highlight">✗ Login mislukt: Gebruiker niet gevonden of onjuist wachtwoord</div>
      `;
      return false;
    }

    updateProgress("userLookupProgressBar", 100, "Gebruiker gevonden");

    // Toon ALLE echte gegevens uit de database
    document.getElementById("loginUserRow").innerHTML = `
      <div class="table-cell">${loginResult.user_id}</div>
      <div class="table-cell">${loginResult.user_name}</div>
      <div class="table-cell">${email}</div>
      <div class="table-cell hash-display">${loginResult.full_hash}</div>
    `;

    await delay(500);

    // Toon de hash in de verificatie sectie
    document.getElementById("storedHashDisplay").textContent =
      loginResult.full_hash;
    updateProgress(
      "verificationProgressBar",
      30,
      "Wachtwoord hash berekenen..."
    );
    await delay(800);

    document.getElementById("inputHashDisplay").textContent =
      loginResult.full_hash;
    updateProgress(
      "verificationProgressBar",
      70,
      "Hash vergelijking uitvoeren..."
    );
    await delay(500);

    updateProgress("verificationProgressBar", 100, "Verificatie voltooid");
    await delay(300);

    document.getElementById("loginVerificationResult").innerHTML = `
      <div class="match-highlight">✓ Wachtwoord verificatie succesvol!</div>
      <p style="margin-top: 15px;">Welkom terug, ${loginResult.user_name}!</p>
      <p>Gebruiker ID: ${loginResult.user_id}</p>
      <div class="hash-display" style="margin-top: 10px;">
        <strong>Opgeslagen hash:</strong><br>
        ${loginResult.full_hash}
      </div>
    `;

    return true;
  } catch (error) {
    console.error("Login verificatie fout:", error);
    document.getElementById("loginVerificationResult").innerHTML = `
      <div class="no-match-highlight">⚠ Er is een fout opgetreden bij de verificatie</div>
      <p>${error.message}</p>
    `;
    return false;
  }
}
