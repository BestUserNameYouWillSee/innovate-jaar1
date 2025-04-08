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
  // Voeg event listeners toe
  setupEventListeners();

  // Voeg CSS toe voor animaties als het nog niet bestaat
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
                text-overflow: ellipsis;
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
    .addEventListener("click", () => showPage("home"));
  document
    .getElementById("goToLoginAfterRegister")
    .addEventListener("click", () => {
      // Reset de hash info velden
      document.getElementById("saltOutput").textContent = "";
      document.getElementById("hashOutput").textContent = "";
      document.getElementById("hashingSuccess").style.display = "none";
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
      // Reset eerst de visualisatie
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

      // Start het hashing proces UI
      showPage("hashing");

      try {
        // Animeer het salt genereren
        await animateSaltGeneration();

        // Animeer de hash berekening
        await animateHashCalculation();

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

        if (result.success) {
          // Na succesvolle registratie, haal de salt op via test-login
          const loginResponse = await fetch("/test-login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          });

          const loginResult = await loginResponse.json();

          if (loginResult.success) {
            // Toon de echte opgeslagen salt
            document.getElementById(
              "saltOutput"
            ).textContent = `Salt: ${loginResult.salt_info.salt_value}`;

            // Toon een voorbeeldhash (kan niet exact de opgeslagen hash tonen)
            const exampleHash = `$argon2id$v=19$m=65536,t=5,p=4$${loginResult.salt_info.salt_value}$<hash_waarde_gedeelte>`;
            document.getElementById("hashOutput").textContent = exampleHash;

            // Toon succesmelding
            document.getElementById("hashingSuccess").style.display = "block";

            // Animeer database opslag
            await animateDatabaseStorage(
              name,
              email,
              exampleHash,
              loginResult.salt_info.salt_value
            );
          } else {
            throw new Error(
              "Kon gebruikersinformatie niet ophalen na registratie"
            );
          }
        } else {
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

      // Validatie
      if (!email || !password) {
        return showError("loginError", "Vul alle velden in");
      }

      // Toon verificatie pagina
      showPage("loginVerification");

      try {
        // Animeer het inlogproces
        const success = await animateLoginVerification(email, password);

        if (success) {
          // Terug knop tonen
          document.getElementById("afterLoginVerification").style.display =
            "block";
        } else {
          // Na korte pauze terug naar login als het mislukt
          await delay(3000);
          showPage("login");
          showError("loginError", "Ongeldige inloggegevens");
        }
      } catch (error) {
        console.error("Inlogfout:", error);
        showPage("login");
        showError("loginError", "Er ging iets mis bij het inloggen");
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

// Animeer database opslag
async function animateDatabaseStorage(name, email, hash, salt) {
  // Zorg dat de rijen leeg zijn voordat we ze vullen
  document.getElementById("newUserRow").innerHTML = "";
  document.getElementById("newSaltRow").innerHTML = "";

  // Vul database row voor gebruiker
  const userRow = document.getElementById("newUserRow");
  userRow.innerHTML = `
        <div class="table-cell">AUTO</div>
        <div class="table-cell">${name}</div>
        <div class="table-cell">${email}</div>
        <div class="table-cell">${hash}</div>
    `;

  // Vul database row voor salt
  const saltRow = document.getElementById("newSaltRow");
  saltRow.innerHTML = `
        <div class="table-cell">AUTO</div>
        <div class="table-cell">AUTO</div>
        <div class="table-cell">${salt}</div>
    `;
  // Animeer opslag
  updateProgress("dbStorageProgressBar", 10, "Verbinden met database...");
  await delay(300);
  updateProgress("dbStorageProgressBar", 30, "Transactie starten...");
  await delay(300);
  updateProgress("dbStorageProgressBar", 60, "Gebruiker opslaan...");
  await delay(500);
  updateProgress("dbStorageProgressBar", 80, "Salt opslaan...");
  await delay(300);
  updateProgress("dbStorageProgressBar", 100, "Transactie voltooid!");
}

function resetDatabaseVisualization() {
  // Reset de database visualisatie
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

// Animeer login verificatie
async function animateLoginVerification(email, password) {
  try {
    // Reset alle velden voordat nieuwe verificatie start
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

    // Stap 1: Gebruiker opzoeken in database
    updateProgress("userLookupProgressBar", 20, "Database query uitvoeren...");
    await delay(500);
    updateProgress("userLookupProgressBar", 50, "Gebruiker zoeken...");
    await delay(400);

    // Test login met extra salt informatie
    const loginResponse = await fetch("/test-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const loginResult = await loginResponse.json();

    if (!loginResult.success) {
      // Gebruiker niet gevonden
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

    // Gebruiker gevonden - haal volledige gebruikersgegevens op
    updateProgress("userLookupProgressBar", 100, "Gebruiker gevonden");

    // Haal gebruikersdetails op via aparte API call
    const userResponse = await fetch("/admin/user-salts");
    const userData = await userResponse.json();

    // Zoek de huidige gebruiker in de lijst
    const currentUser = userData.users.find((user) => user.email === email);

    if (!currentUser) {
      throw new Error("Gebruikersgegevens niet gevonden");
    }

    const userId = currentUser.id;
    const userName = currentUser.name;
    const storedHash = `$argon2id$v=19$m=65536,t=5,p=4$${loginResult.salt_info.salt_value}$HashedPasswordDeelVoorDemo`;

    // Vul de tabel met echte gebruikersgegevens
    document.getElementById("loginUserRow").innerHTML = `
            <div class="table-cell">${userId}</div>
            <div class="table-cell">${userName}</div>
            <div class="table-cell">${email}</div>
            <div class="table-cell">${storedHash}</div>
        `;

    await delay(500);

    // Stap 2: Hash vergelijking
    document.getElementById("storedHashDisplay").textContent = storedHash;

    updateProgress(
      "verificationProgressBar",
      30,
      "Wachtwoord hash berekenen..."
    );
    await delay(800);

    const inputHashDisplay = document.getElementById("inputHashDisplay");
    inputHashDisplay.textContent = `$argon2id$v=19$m=65536,t=5,p=4$${loginResult.salt_info.salt_value}$HashedPasswordDeelVoorDemo`;

    updateProgress(
      "verificationProgressBar",
      70,
      "Hash vergelijking uitvoeren..."
    );
    await delay(500);

    updateProgress("verificationProgressBar", 100, "Verificatie voltooid");
    await delay(300);

    // Toon resultaat
    document.getElementById("loginVerificationResult").innerHTML = `
            <div class="match-highlight">✓ Wachtwoord verificatie succesvol!</div>
            <p style="margin-top: 15px;">Welkom terug, ${userName}!</p>
            <p>Gebruiker ID: ${userId}</p>
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
document.getElementById("backToHomeFromRegister").addEventListener("click", () => {
    resetDatabaseVisualization();
    showPage("home");
});

document.getElementById("goToLoginAfterRegister").addEventListener("click", () => {
    resetDatabaseVisualization();
    showPage("login");
});