// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

class indexShortcutsClass {

	shortcutsDragAndDrop = null;
	parent = null;

	constructor(p_parent) {
		this.parent = p_parent;
	}

	// make 'orderedScene' array using the shortcuts order predefined by the user (drag and drop)
	orderShortcuts(userScene, sysScene) {
		let orderedScene = [];	// scenes in userScene order which exists in sysScene + sysScenes not existing in userScene		
	
		// add scenes from userScene that exists in sysScene
		userScene.forEach(scene => {
			if (sysScene.includes(scene))
   				orderedScene.push(scene);
		});

		// add sysScene not existing in userScene
		sysScene.forEach(scene => {
			if (!orderedScene.includes(scene))
	  			orderedScene.push(scene);
		});
		return orderedScene;
	}

	// show scenes shortcut behind main menu bar
	placeScenesShortcuts(scenesArray, userData) {
		let userScene = [];		// order set by user
		let sysScene = [];		// existing scenes
		let hideShortcuts = [];	// scenes that will not be shown
		const parentClass = this.parent;

		if (this.parent.userData[dhouse_user]) {
			userScene = this.parent.userData[dhouse_user]['scene_order'];
			hideShortcuts = this.parent.userData[dhouse_user]['hide_shortcut'];
		}

		// make 'sysScene' array only for scenes not listed in 'hide_shortcut'
		Object.keys(scenesArray).forEach(scene => {
			if (hideShortcuts.indexOf(scene) == -1)
				sysScene.push(scene);
		});

		const orderedScene = this.orderShortcuts(userScene, sysScene);

		// show scenes shortcuts
		const shortcutDiv = $("scenes-shortcut");
		orderedScene.forEach(scene => {
			const code = createElem("div", { text: scene, classlist: "shortcut"}); 
			shortcutDiv.appendChild(code);
			code.onclick = function() {
				// start this scene	
				parentClass.mqttClient.sendDHouseCommand(CMD_RUN_SCENE, scene);
				showMessage(`Running scene <b>${scene}</b>`,"Scenes");
			};
		});

		// allow drag and drop for the shortcuts
		this.shortcutsDragAndDrop = new Sortable(document.getElementById('scenes-shortcut'), {
	   		animation: 150,
   			delay: 200, 
   			delayOnTouchOnly: true,
   			touchStartThreshold: 5,

			onEnd: function (evt) {
			
				// store new order for current user
   				const buttons = document.querySelectorAll('#scenes-shortcut div');
				const userOrder = Array.from(buttons).map(btn => btn.innerText);
		
				try {
					parentClass.userData = loadUserData()
					.then(data => {
						let dataArray = {};
						if (data !== "")
							dataArray = JSON.parse(data);

						if (!dataArray[dhouse_user])
							dataArray[dhouse_user] = {};
						dataArray[dhouse_user]['scene_order'] = userOrder;
						const ret = storeUserInServer(dataArray)
						.then(ret => {
							if (ret !== "store: done")
								showMessage("Could not store user data.<br>Verify [config] folder permissions.","User settings");
						});
					});
				}
				catch (error) {
					console.log (error);
				}
   			}
		});
	}

	// load existing scenes
	loadScenesShortcuts(userData) {
		loadScenes()
		.then(data => {
			let scenesArray;
			try {
				scenesArray = JSON.parse(data);
				if (scenesArray === "") {
					console.log ("placeScenesShortcuts: json parse error");
					return ;
				}
			}
			catch (error) {
				console.log ("placeScenesShortcuts: " + error);
				return;
			}

			const count = Object.keys(scenesArray).length;
			if (count == 0)
				return;
	
			if (!$("scenes-shortcut")) {
				console.log ("!scenes-shortcut");
				return ;
			}
			this.placeScenesShortcuts(scenesArray, userData);
		});
	}

};
