CREATE TYPE "public"."haber_durum" AS ENUM('taslak', 'yayinda');--> statement-breakpoint
CREATE TYPE "public"."ozet_kaynak" AS ENUM('editor', 'yz', 'cikarimsal');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('okur', 'editor', 'admin');--> statement-breakpoint
CREATE TABLE "haberler" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"baslik" text NOT NULL,
	"spot" text NOT NULL,
	"icerik" text NOT NULL,
	"ozet" text,
	"ozet_kaynak" "ozet_kaynak",
	"etiketler" text[] DEFAULT '{}'::text[] NOT NULL,
	"okuma_suresi" integer DEFAULT 60 NOT NULL,
	"kategori_id" integer NOT NULL,
	"yazar_id" integer NOT NULL,
	"durum" "haber_durum" DEFAULT 'taslak' NOT NULL,
	"son_dakika" boolean DEFAULT false NOT NULL,
	"ornek" boolean DEFAULT false NOT NULL,
	"kaynak_ad" text,
	"kaynak_url" text,
	"goruntulenme" integer DEFAULT 0 NOT NULL,
	"gomme" vector(768),
	"gomme_model" text,
	"yayin_tarihi" timestamp with time zone,
	"guncelleme" timestamp with time zone DEFAULT now() NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kategoriler" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"slug" text NOT NULL,
	"renk" text DEFAULT '#2B3FE0' NOT NULL,
	"sira" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "kategoriler_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "kullanicilar" (
	"id" serial PRIMARY KEY NOT NULL,
	"eposta" text NOT NULL,
	"ad" text NOT NULL,
	"parola_ozeti" text,
	"rol" "rol" DEFAULT 'okur' NOT NULL,
	"github_id" text,
	"avatar" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kullanicilar_eposta_unique" UNIQUE("eposta"),
	CONSTRAINT "kullanicilar_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
CREATE TABLE "yenileme_belirtecleri" (
	"id" text PRIMARY KEY NOT NULL,
	"kullanici_id" integer NOT NULL,
	"aile" text NOT NULL,
	"son_kullanma" timestamp with time zone NOT NULL,
	"kullanildi" boolean DEFAULT false NOT NULL,
	"iptal" boolean DEFAULT false NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "haberler" ADD CONSTRAINT "haberler_kategori_id_kategoriler_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."kategoriler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "haberler" ADD CONSTRAINT "haberler_yazar_id_kullanicilar_id_fk" FOREIGN KEY ("yazar_id") REFERENCES "public"."kullanicilar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yenileme_belirtecleri" ADD CONSTRAINT "yenileme_belirtecleri_kullanici_id_kullanicilar_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kullanicilar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "haberler_slug_idx" ON "haberler" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "haberler_kaynak_url_idx" ON "haberler" USING btree ("kaynak_url");--> statement-breakpoint
CREATE INDEX "haberler_durum_tarih_idx" ON "haberler" USING btree ("durum","yayin_tarihi" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "haberler_kategori_idx" ON "haberler" USING btree ("kategori_id");--> statement-breakpoint
CREATE INDEX "haberler_yazar_idx" ON "haberler" USING btree ("yazar_id");--> statement-breakpoint
CREATE INDEX "haberler_fts_idx" ON "haberler" USING gin (to_tsvector('turkish', "baslik" || ' ' || "spot" || ' ' || "icerik"));--> statement-breakpoint
CREATE INDEX "haberler_gomme_idx" ON "haberler" USING hnsw ("gomme" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "yenileme_kullanici_idx" ON "yenileme_belirtecleri" USING btree ("kullanici_id");--> statement-breakpoint
CREATE INDEX "yenileme_aile_idx" ON "yenileme_belirtecleri" USING btree ("aile");