CREATE TABLE queries (
    id serial primary key,
    search text,
    results longtext,
    lastmod timestamp default now()
);

CREATE TABLE divisions (
	id serial primary key,
	name text
);

CREATE TABLE teams (
	id serial primary key,
	name text,
	division_id int,
	foreign key (division_id) references divisions(id)
);

CREATE TABLE prodcomps (
	id serial primary key,
	product text,
	component text,
	team_id int,
	foreign key (team_id) references teams(id)
);

CREATE TABLE members (
	id serial primary key,
	name text,
	bugemail text,
	nick text,
	team_id int,
	foreign key (team_id) references teams(id)
);

