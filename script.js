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

let userLocation = null;
let finalizedSnapshotBase64 = null;
let isImageQualityApproved = false; // New condition checkpoint variable


// CAMERA LENS VIEWPORT STREAMS ENGINE

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
    console.error(error);
  }
}


// AUTOMATED LOCATION GEOPOSITION DETECTOR

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

// CORE "POINT & SHOOT" SMART UI ACTIONS
actionButtons.forEach(button => {
  button.addEventListener("click", function () {
    const selectedCategory = this.getAttribute("data-category");
    
    actionButtons.forEach(btn => btn.classList.remove("active-lock"));
    this.classList.add("active-lock");
    categoryInput.value = selectedCategory;

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
  
  // Extract pixel matrix mapping configuration rules to judge clarity status
  const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
  analyzeImageVisibilityAndQuality(imgData);

  finalizedSnapshotBase64 = canvas.toDataURL("image/jpeg");
  capturePreview.src = finalizedSnapshotBase64;
  previewWrapper.style.display = "block";
}

// IMAGE QUALITY & VISIBILITY ANALYSIS (NO AI)
function analyzeImageVisibilityAndQuality(imageData) {
  const pixels = imageData.data;
  let totalBrightness = 0;
  const totalPixels = pixels.length / 4;

  // Step 1: Compute Average Brightness (Grayscale values)
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    
    // Standard human eye color luminosity weights
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    totalBrightness += brightness;
  }

  const avgBrightness = totalBrightness / totalPixels;
  const contrastVariance = calculateImageContrast(pixels, avgBrightness, totalPixels);

  qualityBadge.className = "quality-badge"; // Reset styles

  // Step 2: Evaluate mathematical thresholds
  // Brightness < 25 means too dark (finger over lens). Brightness > 245 means blinding glare/blank sheet.
  // Contrast < 12 means image is completely flat, blurry, or lacks any defining contours.
  if (avgBrightness < 25) {
    isImageQualityApproved = false;
    qualityBadge.textContent = "QC Fail: Image Too Dark";
    qualityBadge.classList.add("fail");
    updateDiagnosticDisplay("Quality Alert: Image rejected. The environment is too dark or the lens is covered.", true);
  } else if (avgBrightness > 245) {
    isImageQualityApproved = false;
    qualityBadge.textContent = "QC Fail: Blinding Glare";
    qualityBadge.classList.add("fail");
    updateDiagnosticDisplay("Quality Alert: Image rejected. Too much direct white glare detected.", true);
  } else if (contrastVariance < 12) {
    isImageQualityApproved = false;
    qualityBadge.textContent = "QC Fail: Too Blurry/Flat";
    qualityBadge.classList.add("fail");
    updateDiagnosticDisplay("Quality Alert: Image rejected. The frame is too blurry or lacks identifiable shape contrast.", true);
  } else {
    isImageQualityApproved = true;
    qualityBadge.textContent = "QC Pass: Clear Visibility";
    qualityBadge.classList.add("pass");
    updateDiagnosticDisplay("Quality Verified: Image lighting, sharpness, and shape definitions approved.", false);
  }
}

// Helper mathematical contrast checker
function calculateImageContrast(pixels, avgBrightness, totalPixels) {
  let sumSquaredDiff = 0;
  // Sample every 4th pixel to keep execution lightning fast on mobile processors
  for (let i = 0; i < pixels.length; i += 16) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    sumSquaredDiff += Math.pow(brightness - avgBrightness, 2);
  }
  return Math.sqrt(sumSquaredDiff / (totalPixels / 4));
}

// Clear active snapshot configurations
retakeBtn.addEventListener("click", function() {
  finalizedSnapshotBase64 = null;
  isImageQualityApproved = false;
  categoryInput.value = "";
  previewWrapper.style.display = "none";
  capturePreview.src = "";
  actionButtons.forEach(btn => btn.classList.remove("active-lock"));
  
  updateDiagnosticDisplay("Evidence snapshot cleared. Camera tracking unlocked.", false);
  verifyFormCompleteness();
});


// SYSTEM CHECKPOINTS & FORM VALIDATIONS

function verifyFormCompleteness() {
  const noteContent = descriptionArea.value.trim();
  feedbackList.innerHTML = "";

  if (!finalizedSnapshotBase64) {
    updateDiagnosticDisplay("Requirement Warning: Tap a category icon on the video viewport feed to take a photo.", true);
  } else if (!isImageQualityApproved) {
    updateDiagnosticDisplay("Requirement Warning: Captured image failed visibility checks. Please resnap under better lighting.", true);
  }
  if (!userLocation) {
    updateDiagnosticDisplay("GPS Sync Pending: Turn on your phone's location/GPS settings to trace data.", true);
  }
  if (noteContent === "") {
    updateDiagnosticDisplay("Input Pending: Provide structural description context notes.", true);
  }

  // Submit button blocks entry if image checks fail
  if (finalizedSnapshotBase64 && isImageQualityApproved && categoryInput.value !== "" && userLocation && noteContent !== "") {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Report";
  } else {
    submitBtn.disabled = true;
    if (!finalizedSnapshotBase64) {
      submitBtn.textContent = "Tap a Category Overlay Above";
    } else if (!isImageQualityApproved) {
      submitBtn.textContent = "Fix Blurred/Dark Image Quality";
    } else if (!userLocation) {
      submitBtn.textContent = "Awaiting Location Connection";
    } else {
      submitBtn.textContent = "Fill Out Description Field";
    }
  }
}

descriptionArea.addEventListener("input", verifyFormCompleteness);


// FORM STORAGE CONTEXT SUBMIT MECHANICS

reportForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const noteContent = descriptionArea.value.trim();
  const lockedCategory = categoryInput.value;

  const loggedReportPayload = {
    image: finalizedSnapshotBase64,
    description: noteContent,
    category: lockedCategory,
    location: `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`,
    timestamp: new Date().toLocaleTimeString() + " - " + new Date().toLocaleDateString()
  };

  let databaseItems = JSON.parse(localStorage.getItem("ecoTapReports")) || [];
  databaseItems.unshift(loggedReportPayload);
  localStorage.setItem("ecoTapReports", JSON.stringify(databaseItems));

  displayStoredReportHistory();
  alert("Success! Submission quality verified. Local report logged.");

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


// LOCAL DATABASE STORAGE RENDERING
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
      <img src="${data.image}" alt="Logged Local Evidence Map">
      <p><strong>Category Type:</strong> ${data.category.toUpperCase()}</p>
      <p><strong>Description Details:</strong> ${data.description}</p>
      <p><strong>Captured Location Lat/Long:</strong> ${data.location}</p>
      <p style="font-size: 11px; color: #9ca3af; margin-top: 5px;">Logged on: ${data.timestamp}</p>
    `;
    reportHistory.appendChild(card);
  });
}

// Bootstrap Initialization Engine
openHardwareCameraFeed();
establishPassiveLocationSensing();
displayStoredReportHistory();