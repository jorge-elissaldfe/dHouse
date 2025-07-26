dHouse activity log is stored in a MSQLite3 database.
The dhouse_service.php must be running to be able to log data to the database.

SQLite3:

	> apt install sqlite3 php-sqlite3

	-Run the script "create_tables.sql" from the folder db.
	-Set dhouse.db database file to owner www-data

	> chown www-data:www-data dhouse.db


<img width="639" height="833" alt="image" src="https://github.com/user-attachments/assets/b229b6c1-b739-4557-970a-bd2c090226c1" />
