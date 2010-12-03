CREATE TABLE queries (
    id INT AUTO_INCREMENT,
    PRIMARY KEY (id)
    search TEXT,
    results LONGTEXT,
    lastmod TIMESTAMP DEFAULT now()
);

CREATE TABLE divisions (
    id INT AUTO_INCREMENT,
    PRIMARY KEY (id)
    name TEXT
);

CREATE TABLE teams (
    id INT AUTO_INCREMENT,
    PRIMARY KEY (id)
	name TEXT,
	division_id INT,
	FOREIGN KEY (division_id) REFERENCES divisions(id)
);

CREATE TABLE prodcomps (
    id INT AUTO_INCREMENT,
    PRIMARY KEY (id)
	product TEXT,
	component TEXT,
	team_id INT,
	FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE members (
    id INT AUTO_INCREMENT,
    PRIMARY KEY (id)
	name TEXT,
	bugemail TEXT,
	nick TEXT,
	team_id INT,
	FOREIGN KEY (team_id) REFERENCES teams(id)
);
