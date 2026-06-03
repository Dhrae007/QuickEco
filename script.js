// Select Dom Elements
const video = document.getElementById("webcam");
const actionButtons = document.querySelectorAll(".tap-node");
const categoryInput = document.getElementById("targetCategory");
const previewWrapper = document.getElementById("previewWrapper");
const capturePreview = document.getElementById("capturePreview");
const qualityBadge = document.getElementById("qualityBadge");
const retakeBtn = document.getElementById("retakeBtn");
const descriptionArea = document.getElementById("description");
const reportForm = document.getElementById("reportForm");
const feedbackList = document.getElementById("feedbackList");
const googleMap = document.getElementById("googleMap");
const mapContainer = document.querySelector(".map-container");
const reportHistory = document.getElementById("reportHistory");
const submitBtn = document.getElementById("submitBtn");
const ipStatusField = document.getElementById("ipStatus");

// Layout wrapper blocks for dynamic error injection
const cameraGroup = document.getElementById("cameraGroup");
const descriptionGroup = document.getElementById("descriptionGroup");
const mapGroup = document.getElementById("mapGroup");

let userLocation = null;
let finalizedSnapshotBase64 = null;
let isImageQualityApproved = false;
let userIpAddress = "Detecting...";

// ==========================================
// AUTOMATED IP ADDRESS DETECTOR
// ==========================================
async function detectDeviceNetworkIp() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    if (!response.ok) throw new Error("Network routing issue");
    const data = await response.json();
    userIpAddress = data.ip;
    if (ipStatusField) {
      ipStatusField.textContent = `Network Tracking Sync: Active [IP: ${userIpAddress}]`;
      ipStatusField.style.color = "#16a34a";
    }
  } catch (error) {
    userIpAddress = "Unavailable/Offline";
    if (ipStatusField) {
      ipStatusField.textContent = "Network Tracking Sync: Restricted/Offline";
      ipStatusField.style.color = "#dc2626";
    }
  }
}

// ==========================================
// CAMERA LENS VIEWPORT STREAMS ENGINE
// ==========================================
async function openHardwareCameraFeed() {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    video.srcObject = mediaStream;
    updateDiagnosticDisplay("Camera stream active. Point and tap an element node to capture instantly.", false);
  } catch (error) {
    updateDiagnosticDisplay("Hardware Intercept Fail: Please approve device camera hardware permissions.", true);
  }
}

// ==========================================
// AUTOMATED LOCATION GEOPOSITION DETECTOR
// ==========================================
function establishPassiveLocationSensing() {
  if (!navigator.geolocation) {
    updateDiagnosticDisplay("System Error: Geolocation tracking missing from your browser engine architecture.", true);
    return;
  }

  navigator.geolocation.watchPosition(
    function (position) {
      userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      
      if (mapContainer && googleMap) {
        mapContainer.style.display = "block";
        mapGroup.classList.remove("input-error-gps"); // Clear warning once location matches
        googleMap.src = `https://maps.google.com/maps?q=${userLocation.latitude},${userLocation.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
      }
      verifyFormCompleteness();
    },
    function (error) {
      console.log("Awaiting system device GPS location switch trigger...", error.message);
      userLocation = null;
      if (mapContainer) mapContainer.style.display = "none";
      verifyFormCompleteness();
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

// ==========================================
// CORE "POINT & SHOOT" SMART UI ACTIONS
// ==========================================
actionButtons.forEach(button => {
  button.addEventListener("click", function () {
    const selectedCategory = this.getAttribute("data-category");
    
    actionButtons.forEach(btn => btn.classList.remove("active-lock"));
    this.classList.add("active-lock");
    categoryInput.value = selectedCategory;

    cameraGroup.classList.remove("input-error");
    generateViewfinderSnapshot();
    verifyFormCompleteness();
  });
});

function generateViewfinderSnapshot() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  
  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
  analyzeImageVisibilityAndQuality(imgData);

  finalizedSnapshotBase64 = canvas.toDataURL("image/jpeg");
  capturePreview.src = finalizedSnapshotBase64;
  previewWrapper.style.display = "block";
}

function analyzeImageVisibilityAndQuality(imageData) {
  const pixels = imageData.data;
  let totalBrightness = 0;
  const totalPixels = pixels.length / 4;

  for (let i = 0; i < pixels.length; i += 4) {
    totalBrightness += (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]);
  }

  const avgBrightness = totalBrightness / totalPixels;
  const contrastVariance = calculateImageContrast(pixels, avgBrightness, totalPixels);

  qualityBadge.className = "quality-badge"; 

  if (avgBrightness < 25) {
    isImageQualityApproved = false;
    qualityBadge.textContent = "QC Fail: Too Dark";
    qualityBadge.classList.add("fail");
  } else if (avgBrightness > 245) {
    isImageQualityApproved = false;
    qualityBadge.textContent = "QC Fail: Blinding Glare";
    qualityBadge.classList.add("fail");
  } else if (contrastVariance < 12) {
    isImageQualityApproved = false;
    qualityBadge.textContent = "QC Fail: Too Blurry";
    qualityBadge.classList.add("fail");
  } else {
    isImageQualityApproved = true;
    qualityBadge.textContent = "QC Pass: Clear Visibility";
    qualityBadge.classList.add("pass");
  }
}

function calculateImageContrast(pixels, avgBrightness, totalPixels) {
  let sumSquaredDiff = 0;
  for (let i = 0; i < pixels.length; i += 16) {
    const brightness = 0.2126 * pixels[i] + 0.7152 * pixels[i+1] + 0.0722 * pixels[i+2];
    sumSquaredDiff += Math.pow(brightness - avgBrightness, 2);
  }
  return Math.sqrt(sumSquaredDiff / (totalPixels / 4));
}

retakeBtn.addEventListener("click", function() {
  finalizedSnapshotBase64 = null;
  isImageQualityApproved = false;
  categoryInput.value = "";
  previewWrapper.style.display = "none";
  capturePreview.src = "";
  actionButtons.forEach(btn => btn.classList.remove("active-lock"));
  verifyFormCompleteness();
});

// ==========================================
// SYSTEM CHECKPOINTS & FORM VALIDATIONS
// ==========================================
function verifyFormCompleteness() {
  const noteContent = descriptionArea.value.trim();
  feedbackList.innerHTML = "";

  let hasErrors = false;

  if (!finalizedSnapshotBase64) {
    updateDiagnosticDisplay("Requirement Warning: Tap a category icon on the video viewport feed to take a photo.", true);
    hasErrors = true;
  } else if (!isImageQualityApproved) {
    updateDiagnosticDisplay("Requirement Warning: Captured image failed visibility checks.", true);
    hasErrors = true;
  }
  
  if (!categoryInput.value) {
    updateDiagnosticDisplay("Requirement Warning: Category assignment payload is missing.", true);
    hasErrors = true;
  }

  if (!userLocation) {
    updateDiagnosticDisplay("GPS Sync Pending: Turn on location/GPS settings to trace data.", true);
    hasErrors = true;
  }
  
  if (noteContent === "") {
    updateDiagnosticDisplay("Input Pending: Provide structural description context notes.", true);
    hasErrors = true;
  }

  if (finalizedSnapshotBase64 && isImageQualityApproved && categoryInput.value) cameraGroup.classList.remove("input-error");
  if (noteContent !== "") descriptionGroup.classList.remove("input-error");

  // Dynamic Button State Rules
  if (!hasErrors) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Report";
  } else {
    submitBtn.disabled = true;
    if (!finalizedSnapshotBase64 || !categoryInput.value) {
      submitBtn.textContent = "Select Category Tool Overlay";
    } else if (!isImageQualityApproved) {
      submitBtn.textContent = "Fix Blurred/Dark Image Quality";
    } else if (!userLocation) {
      submitBtn.textContent = "Awaiting GPS Signal Lock...";
    } else {
      submitBtn.textContent = "Fill Out Description Field";
    }
  }
}

descriptionArea.addEventListener("input", verifyFormCompleteness);

// ==========================================
// CRITICAL FIX: HARD SUBMIT INTERCEPT PROTECTION GATE
// ==========================================
reportForm.addEventListener("submit", function (event) {
  event.preventDefault(); // Stop form submission execution thread immediately

  const noteContent = descriptionArea.value.trim();
  const lockedCategory = categoryInput.value;

  // CRITICAL CHECKPOINT EXTRACTION: Catches mid-session drops immediately at runtime
  let validationFailure = false;
  let alertMessage = "Submission Rejected!\n\n";

  if (!lockedCategory) {
    cameraGroup.classList.add("input-error");
    alertMessage += "- Category Selection is missing or corrupted.\n";
    validationFailure = true;
  }

  if (!finalizedSnapshotBase64 || !isImageQualityApproved) {
    cameraGroup.classList.add("input-error");
    alertMessage += "- Valid, clear viewfinder image evidence is required.\n";
    validationFailure = true;
  }

  if (!userLocation) {
    if (mapGroup) mapGroup.classList.add("input-error-gps");
    alertMessage += "- Critical Error: Device lost its GPS signal location mapping right before submission.\n";
    validationFailure = true;
  }

  if (noteContent === "") {
    descriptionGroup.classList.add("input-error");
    alertMessage += "- Issue Description text field cannot be blank.\n";
    validationFailure = true;
  }

  // Hard execution crash blocker
  if (validationFailure) {
    alert(alertMessage + "\nPlease resolve the highlighted issues and try again.");
    verifyFormCompleteness();
    return; 
  }

  // Compile final payload if completely clean
  const loggedReportPayload = {
    image: finalizedSnapshotBase64,
    description: noteContent,
    category: lockedCategory,
    location: `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`,
    deviceIp: userIpAddress,
    timestamp: new Date().toLocaleTimeString() + " - " + new Date().toLocaleDateString()
  };

  // -------------------------------------------------------------
  // INTEGRATION NOTE: For the demo sandbox build, we push to localStorage.
  // When embedding this into the main app architecture, replace this block 
  // with your custom API pipeline emit command:
  // e.g., window.dispatchEvent(new CustomEvent('wasteLogged', { detail: loggedReportPayload }));
  // -------------------------------------------------------------
  let databaseItems = JSON.parse(localStorage.getItem("ecoTapReports")) || [];
  databaseItems.unshift(loggedReportPayload);
  localStorage.setItem("ecoTapReports", JSON.stringify(databaseItems));

  displayStoredReportHistory();
  alert("Success! Submission parameters verified and passed cleanly.");

  // Post-submit UI cleanup sequence
  reportForm.reset();
  finalizedSnapshotBase64 = null;
  isImageQualityApproved = false;
  categoryInput.value = "";
  previewWrapper.style.display = "none";
  capturePreview.src = "";
  actionButtons.forEach(btn => btn.classList.remove("active-lock"));
  if (mapContainer) mapContainer.style.display = "none"; 
  submitBtn.disabled = true;
  verifyFormCompleteness();
});

function updateDiagnosticDisplay(message, isWarning = false) {
  const li = document.createElement("li");
  li.textContent = message;
  li.style.color = isWarning ? "#dc2626" : "#16a34a";
  feedbackList.appendChild(li);
}

function displayStoredReportHistory() {
  if (!reportHistory) return;
  reportHistory.innerHTML = "";
  let dataset = JSON.parse(localStorage.getItem("ecoTapReports")) || [];
  if (dataset.length === 0) {
    reportHistory.innerHTML = "<p style='color: white; text-align: center;'>No reports saved yet.</p>";
    return;
  }
  dataset.forEach(function (data) {
    const card = document.createElement("div");
    card.classList.add("report-card");
    card.innerHTML = `
      <img src="${data.image}" alt="Evidence">
      <p><strong>Category Type:</strong> ${data.category.toUpperCase()}</p>
      <p><strong>Description Details:</strong> ${data.description}</p>
      <p><strong>Location Lock:</strong> ${data.location}</p>
      <p><strong>Device IP:</strong> ${data.deviceIp || "Not Captured"}</p>
      <p style="font-size: 11px; color: #9ca3af; margin-top: 5px;">Logged on: ${data.timestamp}</p>
    `;
    reportHistory.appendChild(card);
  });
}

// Startup Initializations
detectDeviceNetworkIp();
openHardwareCameraFeed();
establishPassiveLocationSensing();
displayStoredReportHistory();