CREATE TABLE queries (
    id INT AUTO_INCREMENT,
    PRIMARY KEY (id),
    search TEXT COLLATE utf8_bin,
    results LONGTEXT COLLATE utf8_bin,
    lastmod TIMESTAMP DEFAULT now()
);

CREATE TABLE divisions (
    id INT AUTO_INCREMENT,
    PRIMARY KEY (id),
    name TEXT COLLATE utf8_bin
);

CREATE TABLE teams (
    id INT AUTO_INCREMENT,
    PRIMARY KEY (id),
    name TEXT COLLATE utf8_bin,
    division_id INT,
    FOREIGN KEY (division_id) REFERENCES divisions(id)
);

CREATE TABLE prodcomps (
    id INT AUTO_INCREMENT,
    PRIMARY KEY (id),
    product TEXT COLLATE utf8_bin,
    component TEXT COLLATE utf8_bin,
    team_id INT,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE users (
    id INT AUTO_INCREMENT,
    PRIMARY KEY (id),
    name TEXT COLLATE utf8_bin,
    bugemail TEXT COLLATE utf8_bin,
    nick TEXT COLLATE utf8_bin,
    site_admin BOOLEAN
);

CREATE TABLE members (
    id INT AUTO_INCREMENT,
    PRIMARY KEY (id),
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    team_id INT,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    team_admin BOOLEAN
);
