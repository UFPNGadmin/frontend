const backendBaseUrl = "https://flask-repo-qiro.onrender.com/"; // Replace with your Render Flask URL

const zipUrlInput = document.getElementById("zip-url");
const cookiesInput = document.getElementById("cookies");
const loadFilesBtn = document.getElementById("load-files-btn");
const statusDiv = document.getElementById("status");
const fileListContainer = document.getElementById("file-list-container");
const fileList = document.getElementById("file-list");
const totalSizeSpan = document.getElementById("total-size");
const downloadBtn = document.getElementById("download-btn");

const rewardedAdContainer = document.getElementById("rewarded-ad-container");
const simulateAdBtn = document.getElementById("simulate-ad-btn");

let files = [];
let selectedIndices = [];
let unlocked = false;

loadFilesBtn.onclick = async () => {
  const url = zipUrlInput.value.trim();
  if (!url) {
    alert("Please enter ZIP URL");
    return;
  }

  fileListContainer.style.display = "none";
  statusDiv.textContent = "Loading ZIP contents...";
  files = [];
  selectedIndices = [];
  unlocked = false;
  downloadBtn.disabled = true;
  totalSizeSpan.textContent = "0 B";

  try {
    const headers = {};
    const cookieVal = cookiesInput.value.trim();
    if (cookieVal) {
      headers["Cookie"] = cookieVal;
    }
    const resp = await fetch(`${backendBaseUrl}/list-files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify({ url }),
    });

    if (!resp.ok) {
      statusDiv.textContent = `Failed to load ZIP contents: ${resp.status} ${resp.statusText}`;
      return;
    }

    files = await resp.json();

    if (!Array.isArray(files) || files.length === 0) {
      statusDiv.textContent = "No files found or ZIP is empty.";
      return;
    }

    renderFileList();
    fileListContainer.style.display = "block";
    statusDiv.textContent = "Select files to download.";
  } catch (err) {
    statusDiv.textContent = `Error: ${err.message}`;
  }
};


function renderFileList() {
  fileList.innerHTML = "";
  files.forEach((file, idx) => {
    const li = document.createElement("li");
    li.textContent = `${file.filename} (${formatBytes(file.uncompressed_size)})`;
    li.onclick = () => toggleSelect(idx, li);
    fileList.appendChild(li);
  });
}

function toggleSelect(idx, liElement) {
  if (selectedIndices.includes(idx)) {
    selectedIndices = selectedIndices.filter(i => i !== idx);
    liElement.classList.remove("selected");
  } else {
    selectedIndices.push(idx);
    liElement.classList.add("selected");
  }
  updateTotalSize();
  downloadBtn.disabled = selectedIndices.length === 0 || !unlocked;
}

function updateTotalSize() {
  let total = 0;
  selectedIndices.forEach(i => {
    total += files[i].uncompressed_size;
  });
  totalSizeSpan.textContent = formatBytes(total);
}

// Format bytes nicely
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KiB", "MiB", "GiB", "TiB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
}

// Download button triggers ad unlock first
downloadBtn.onclick = () => {
  if (!unlocked) {
    showRewardedAd();
  } else {
    startDownload();
  }
};

function showRewardedAd() {
  statusDiv.textContent = "Please watch the rewarded ad to unlock download.";
  rewardedAdContainer.style.display = "block";
  downloadBtn.disabled = true;

  // TODO: Insert Adsterra rewarded ad script here with callback to unlockDownload()

  // For now, simulate with test button:
  simulateAdBtn.style.display = "inline-block";
}

simulateAdBtn.onclick = () => {
  simulateAdBtn.style.display = "none";
  unlockDownload();
};

function unlockDownload() {
  unlocked = true;
  rewardedAdContainer.style.display = "none";
  statusDiv.textContent = "Ad watched. You can now download files.";
  downloadBtn.disabled = selectedIndices.length === 0;
}

async function startDownload() {
  statusDiv.textContent = "Starting download...";
  downloadBtn.disabled = true;

  const url = zipUrlInput.value.trim();
  const cookieVal = cookiesInput.value.trim();

  try {
    const selectedFiles = selectedIndices.map(i => files[i].filename);
    const resp = await fetch(`${backendBaseUrl}/download`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieVal ? { "Cookie": cookieVal } : {}),
      },
      body: JSON.stringify({ url, files: selectedFiles }),
    });

    if (!resp.ok) {
      statusDiv.textContent = `Download failed: ${resp.status} ${resp.statusText}`;
      downloadBtn.disabled = false;
      return;
    }

    // Assume the response is a stream of the partial ZIP or files
    const blob = await resp.blob();
    const downloadUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "partial_download.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(downloadUrl);

    statusDiv.textContent = "Download completed.";
  } catch (err) {
    statusDiv.textContent = `Error: ${err.message}`;
    downloadBtn.disabled = false;
  }
}
