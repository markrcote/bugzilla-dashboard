CREATE TABLE queries (
    id serial primary key,
    search text,
    results text,
    lastmod timestamp default now()
);

