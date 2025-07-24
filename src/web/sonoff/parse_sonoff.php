<?php

// dHouse
// Tasmota devices manager
// Specific sonoff data retrieve when using mDNS
// Jorge Elissalde 2025

// get data from device answer and verify if DIY is set
function get_sonoff_rawdata(&$line, $separator, &$sonoff_device) {
    $v = array();

	do {
		$line = ltrim($line);
		$line = str_replace('\\"', '"', $line);
		$v[] = $line;

		// verify if this is a Sonoff DIY
		if (substr_compare($line, "txt = [\"data", 0, 12) == 0) {

			$p = 12;
			while ($line[$p] != '=' && $line[$p] !='\n' && $line[$p] != '\r')
				++$p;

			if ($line[$p] == '=') {
				$txt = substr($line,$p+1);
				// this is a Sonoff search for line
				if (substr_compare($txt, "{\"switch\":", 0, 10) == 0) {
					$sonoff_device = true;
				}
			}
		}

		$line = strtok( $separator );
		if ($line !== false && $line[0] == '=')
			break;
	}
	while ($line !== false);
	return $v;
}


function parse_sonoff_data($v) {
	$sd = array();
	foreach ($v as $line) {
		$varvalue = get_sonoff_var($line,$varname);
		if (!empty($varvalue)) {
			// get vars from txt
			if ($varname == "txt") {
				$switch = get_sonoff_variable_value($varvalue, "\"switch\":");
				$sd["switch"] = $switch;
			}
			$sd[$varname] = $varvalue;
        }
    }
    return $sd;
}

function get_sonoff_var($line, &$varname) {
    if (($r=strpos($line,"="))==false)
        return "";

	$varname = rtrim(substr($line,0,$r));
	if ($varname[0] =='"')
		$varname = substr($varname,1);

	if (($r=strpos($line, "[")) == false)
		return "";

	$l = substr($line,$r+1);
	if ($l[strlen($l)-1] == ']')
		$l=substr($l,0,strlen($l)-1);
    return $l;
}

function get_sonoff_variable_value($dataset, $var) {
    $val = "";
    if (($p=strpos($dataset, $var)) === false)
        return $val;

    $p+=strlen($var)+1;
    $start = $p;
    while ($p < strlen($dataset) && $dataset[$p] != '"')
        ++$p;

    if($p<strlen($dataset))
        $val = substr($dataset, $start, $p-$start);
    return $val;
}


?>