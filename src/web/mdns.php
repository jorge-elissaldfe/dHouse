<?php
// dHouse
// Tasmota devices manager
// Jorge Elissalde 2025

$bypass_javascript_conf = true;

require ("config.php");
require ("sonoff/parse_sonoff.php");


function get_mdns_list() {

	$r = shell_exec(AVAHI_COMMAND);

	if ($r == null) {
		return [
            "error" => "Could not connect to mDNS server. The service may not be running."
        ];
	}

	$separator = "\r\n";
	$line = strtok($r, $separator);
	$devices = array();
	while ($line !== false) {
		if ($line[0] != '=') {
			$line = strtok( $separator );
			continue;
		}
		$sonoff_device = false;
		$v = get_sonoff_rawdata($line,$separator,$sonoff_device);
		if ($sonoff_device)
			$devices[] = parse_sonoff_data($v);
	}
	return $devices;
}

echo json_encode(get_mdns_list());

?>
