// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

let editPlaces;

class editPlacesClass {

	showPlacesAndDevices() {
		if (typeof config == 'undefined')
			return;
		if (!config?.dHouse?.places)
			return;

		const mainContainer = $("main-container");
		const places = config.dHouse.places;
		const fragment = document.createDocumentFragment(); 

		mainContainer.innerHTML = "";
		let section = this.addPlace("No Place", false);
		fragment.appendChild(section);

		places.forEach((place) => {
			const section = this.addPlace(place);
			fragment.appendChild(section);
		});

		// "Add Place" button
		section = createElem("section", { classlist: "section-center-noborder" });
		const addButton = createElem("button", { id: "add-place-button", classlist: "basic-button", text: "Add Place" });

		section.appendChild(addButton);
		fragment.appendChild(section);
		mainContainer.appendChild(fragment);
		this.setAddPlaceButton();
	}

	addPlace(place, allowDelete=true) {

		if (devices === undefined)
			return;

		const section = createElem("section", { id: place, classlist: "container-place", style: { width: "80%", position: "relative" }});
		if (allowDelete) {
			const img = createElem("img", { id: place, src: "img/cross.png", title: "Delete place", 
											style: { position: "absolute", top: "10px", 
													 right: "10px", width: "20px", cursor: "pointer", opacity: "0.4" }});
			img.addEventListener("click", () => {
				this.deletePlace(place);
			});
			section.appendChild(img);
		}

		const placeName = document.createTextNode(place);
		const span = createElem("span", { id: place, style: { fontWeight: "600" }});
		span.appendChild(placeName);
		section.appendChild(span);
		// show devices assigned to this place
		Object.keys(devices).forEach(dev => {
			if (place == devices[dev].Place || !devices[dev].Place && place === "No Place") {
				const devSection = createElem ("section", { id: `dev_${dev}`, classlist: "container-device", 
															style: { width: "80%",  position: "relative" }});
				devSection.appendChild(document.createTextNode(devices[dev].FriendlyName));
				section.appendChild(devSection);
			}
		});
		return section;
	}

	// click over 'delete place' cross image
	async deletePlace(placeName) {
		if (!await showConfirm(`Delete place ${placeName} ?`,"Places"))
			return;

		// remove devices from this Place
		Object.values(devices).forEach(dev => {
	    	if (dev.Place === placeName) 
	        	dev.Place = ""; 
		});

		// remove this place from places
		let index = config.dHouse.places.indexOf(placeName);
		if (index > -1)
			config.dHouse.places.splice(index, 1);

	    this.showPlacesAndDevices();
	   	this.setDragAndDrop();
		storeConfigurationInServer();
	}


	setDragAndDrop() {
		const dropZones = document.querySelectorAll(".container-place");
		dropZones.forEach(zone => {
			new Sortable(zone, {
				group: "places",
				animation: 150,
				onAdd: function (evt) {
					const devId = evt.item.id.slice(4); // remove "dev_" prefix
					const newPlaceId = evt.to.id;
					devices[devId].Place = (newPlaceId === "No Place") ? "" : newPlaceId;
					storeConfigurationInServer();
				}
			});
		});
	}

	handleDragStart(event) {
    	event.dataTransfer.setData("text", event.target.id);
	}

	handleDragOver(event) {
    	event.preventDefault();
	}

	handleDrop(event) {
	    event.preventDefault();
	    const draggedElementId = event.dataTransfer.getData("text");
	    const draggedElement = $(draggedElementId);
	    const dropZoneId = event.target.id;
	    let droppedOverPlace = "";

    	if (dropZoneId.startsWith('dev_')) {
	        if (dropZoneId === draggedElementId) 
				return;
			// the device has been dropped in a device
			// search all places for this device and drop into this place
        	const droppedOverDevice = dropZoneId.slice(4);
        	for (const dev of Object.keys(devices)) {
	            if (dev === droppedOverDevice) {
                	droppedOverPlace = devices[dev].Place || "";
                	break;
            	}
        	}
    	} else {
	        droppedOverPlace = dropZoneId;
	    }

    	const dev = draggedElementId.slice(4);
    	devices[dev].Place = droppedOverPlace;
    	storeConfigurationInServer();
    	this.showPlacesAndDevices();
    	this.setDragAndDrop();
	}

	setAddPlaceButton() {
		// Add Place button
		const addPlace = $("add-place-button");
		addPlace.addEventListener("click", function (event) {
			// show Add Place popup
			popup=$("popup");
   			popup.style.left="50%";
   			popup.style.top="50%";
   			popup.style.width="400px";
   			popup.style.transform = "translate(-50%, -50%)";

   			overlay = $("overlay");	//		""
   			overlay.style.width="100%";
   			overlay.style.height="100%";
	   		popup.style.display = "block";
   			overlay.style.display = "block";
		});
	}

	setupNavigation() {
		$('back-image')?.addEventListener("click", () => go_url("index.php"));
		overlay = $("overlay");
		// Add Place popup | accept button
		const buttonAccept = $("button-accept");

		buttonAccept.addEventListener("click", () => {
			// turn off popup
			const popup = $("popup");
			popup.style.display = "none";
			overlay.style.display = "none";
			// check name repetition
			const textNewPlace = $("text-new-place").value.trim();
			if (textNewPlace.length==0 || textNewPlace.toLowerCase() === "no place") 
				return;
			for (const place of config.dHouse.places) {
				if (place.toLowerCase() === textNewPlace.toLowerCase())
					return;
			}
			config.dHouse.places.push(textNewPlace);
	    	storeConfigurationInServer();
	    	editPlaces.showPlacesAndDevices();
	    	editPlaces.setDragAndDrop();
		});

		// Add Place popup | canel button
		const buttonCancel = $("button-cancel");
		buttonCancel.addEventListener("click", () => {
			const popup = $("popup");
			popup.style.display = "none";
			overlay.style.display = "none";
		});
	}
}

// called from init_page after configuration is retrieved
function startPage() {
	editPlaces.showPlacesAndDevices();
	editPlaces.setDragAndDrop();
}

document.addEventListener("DOMContentLoaded", function() {
	editPlaces = new editPlacesClass();
	editPlaces.setupNavigation();
});

	