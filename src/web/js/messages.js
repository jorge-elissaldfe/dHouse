// dHouse
// Jorge Elissalde 2025

let confirmResolve;

// generic message, like 'alert'
function showMessage(message, title='', event=null) {
	$("modalTitle").textContent = title; 
    $("modalMessage").innerHTML = message;
    $("customModalOverlay").style.display = "block"; // "flex";

	if (event) {
		const modal = $("customModal");
		modal.style.left = `${event.clientX}px`;
  		modal.style.top = `${event.clientY}px`;
	}
	else {

		$('customModalOverlay').style.display = 'flex';
	}
}
  
function closeMessage() {
    $("customModalOverlay").style.display = "none";
}

function customConfirm(message, title) {
    return new Promise((resolve) => {
      	confirmResolve = resolve;
      	$("modalTitleConfirm").textContent = title;
      	$("modalMessageConfirm").innerHTML = message;
      	$("customModalOverlayConfirm").style.display = "flex";
    });
}

function closeConfirm(retValue) {
    $("customModalOverlayConfirm").style.display = "none";
	confirmResolve(retValue);
}

// generic confirmation, like 'confirm'
async function showConfirm(message, title='') {
	return await customConfirm(message, title);
}

document.addEventListener("DOMContentLoaded", () => {
	$('close-message')?.addEventListener("click", () => closeMessage());
	$('close-confirm-true')?.addEventListener("click", () => closeConfirm(true));
	$('close-confirm-false')?.addEventListener("click", () => closeConfirm(false));
});