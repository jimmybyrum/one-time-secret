ALTER TABLE public.ots ADD COLUMN "id" text NOT NULL;
ALTER TABLE public.ots ADD COLUMN "value" text NOT NULL;
ALTER TABLE public.ots ADD COLUMN "ttl" integer NOT NULL;
ALTER TABLE public.ots ADD COLUMN "expires" time NOT NULL;
ALTER TABLE public.ots ADD COLUMN "password" text NULL DEFAULT NULL;

-- CREATE UNIQUE INDEX (id) ON (id) USING btree ((null));
ALTER TABLE public.ots ADD CONSTRAINT SQLProPK_publicots PRIMARY KEY (id);