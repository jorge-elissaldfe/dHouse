sqlite3 dhouse.db << EOF
CREATE TABLE if not exists log(id integer primary key, 
		 date TEXT, 
		 device text, 
		 command text, 
		 data text, 
		 source text default '', 
		 friendlyName text);
EOF
