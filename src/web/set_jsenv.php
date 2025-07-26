<?php
// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025
?>
const $ = id => document.getElementById(id);
const SONOFF_DEVICEID_LEN = <?=SONOFF_DEVICEID_LEN?>;
const BRIDGE_MODULE = '<?=BRIDGE_MODULE?>';
const DHOUSE_CONFIG = '<?=DHOUSE_CONFIG?>';
const TASMOTA_LAST_VERSION = '<?=TASMOTA_LAST_VERSION?>';
let   selected_place = '<?=addslashes($_SESSION['selected_place'] ?? '')?>';
let   lastTasmotaFirmware = '<?=addslashes($_SESSION['tasmota_firmware'] ?? '')?>';
const dhouse_user=<?=json_encode($_SERVER['PHP_AUTH_USER'])?>;
const device = '<?=$_GET['device'] ?? ''?>';
const set_sleep_time = <?=json_encode(EXPERIMENTAL_SET_SLEEP_TIME); ?>;
const set_template = <?=json_encode(EXPERIMENTAL_SET_TEMPLATE); ?>;
const set_button_hold = <?=json_encode(EXPERIMENTAL_BUTTON_HOLD); ?>;
const CMD_RELOAD = <?=json_encode(CMD_RELOAD);?>;
const backPageHandler = () => window.history.back();


if ($("back-image"))
	$('back-image')?.addEventListener("click", backPageHandler);
