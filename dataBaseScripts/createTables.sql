DROP TABLE IF EXISTS PRODOTTI_CARRELLI;
DROP TABLE IF EXISTS CARRELLI_CONDIVISI;
DROP TABLE IF EXISTS PREZZI;
DROP TABLE IF EXISTS CARRELLI;
DROP TABLE IF EXISTS PRODOTTI;
DROP TABLE IF EXISTS NEGOZI;
DROP TABLE IF EXISTS CLIENT_INFO;
DROP TABLE IF EXISTS CLIENT;
DROP TABLE IF EXISTS CATEGORIES;

CREATE TABLE PRODOTTI(productCod varchar(70),
                      summaryName varchar(100) NOT NULL,
                      name varchar(500) NOT NULL,
                      description varchar(3000) NOT NULL,
                      srcImage varchar(2050) NOT NULL,
                      producer varchar(100) NOT NULL,
                      PRIMARY KEY (productCod));

CREATE TABLE NEGOZI(sellerCod REAL,
                    srcLogo varchar (2050) NOT NULL,
                    sellerName varchar(250) NOT NULL,
                    address varchar (300) NOT NULL,
                    lat DOUBLE PRECISION NOT NULL,
                    lng DOUBLE PRECISION NOT NULL,
                    PRIMARY KEY (SellerCod));

CREATE TABLE PREZZI(productCod varchar(30) REFERENCES PRODOTTI(productCod) ON DELETE CASCADE
                                                                           ON UPDATE CASCADE,
                    sellerCod REAL REFERENCES NEGOZI(SellerCod) ON DELETE CASCADE
                                                                ON UPDATE CASCADE,
                    price DOUBLE PRECISION NOT NULL CHECK (price > 0),
                    offert BOOLEAN NOT NULL,
                    offertPrice DOUBLE PRECISION,
                    PRIMARY KEY (productCod, sellerCod));


CREATE TABLE CLIENT(userName varchar(20) PRIMARY KEY,
                   name varchar(50) NOT NULL,
                   surname varchar(50) NOT NULL,
                   apiKey varchar(64) UNIQUE NOT NULL,
                   password varchar(64) NOT NULL); /*->sha256*/

CREATE TABLE CLIENT_INFO(userName varchar(20) PRIMARY KEY,
                         email varchar(50) NOT NULL,
                         address varchar(70),
                         avatarID real not null CHECK(avatarID<11 and avatarID>=0),
                        FOREIGN KEY (userName) REFERENCES CLIENT(userName) ON DELETE CASCADE ON UPDATE CASCADE);


CREATE TABLE CARRELLI(cartCod UUID PRIMARY KEY,
                      userNameCreator varchar(20) REFERENCES CLIENT(userName) ON DELETE CASCADE
                                                                            ON UPDATE CASCADE,
                      titolo varchar(30) NOT NULL);




CREATE TABLE PRODOTTI_CARRELLI(cartCod UUID REFERENCES CARRELLI(cartCod) ON DELETE CASCADE        /*-> LISTA */
                                                                         ON UPDATE CASCADE,
                               productCod varchar(30) REFERENCES PRODOTTI(productCod) ON DELETE CASCADE
                                                                                      ON UPDATE CASCADE,
                               sellerCod REAL REFERENCES NEGOZI(sellerCod) ON DELETE CASCADE
                                                                           ON UPDATE CASCADE,
                               userName varchar(20) REFERENCES CLIENT(userName) ON UPDATE CASCADE
                                                                              ON DELETE CASCADE,
                               quantity INTEGER,
                               FOREIGN KEY (productCod, sellerCod) REFERENCES PREZZI(productCod, sellerCod) ON DELETE CASCADE
                                                                                                            ON UPDATE CASCADE,
                               PRIMARY KEY (productCod, cartCod, SellerCod, userName));

CREATE TABLE CARRELLI_CONDIVISI(cartCod UUID REFERENCES CARRELLI(cartCod) ON UPDATE CASCADE        /*-> LISTA */
                                                                          ON DELETE CASCADE,
                                userName varchar(20) REFERENCES CLIENT(userName) ON UPDATE CASCADE
                                                                               ON DELETE CASCADE,
                                PRIMARY KEY(cartCod, userName));

CREATE TABLE CATEGORIES(categoryID REAL PRIMARY KEY,
                        name varchar(30) UNIQUE NOT NULL);

CREATE TABLE PRODUCT_CATEGORY(productCod varchar(30) REFERENCES PRODOTTI(productCod),
                              categoryID REAL REFERENCES CATEGORIES(categoryID),
                              PRIMARY KEY (productCodm categoryID));
