-- Fills pokemon.name_ja and pokemon.alt_name_ja (migration 0023). Run in the Supabase SQL editor, step by step.
--
-- Sources
--   Species and main-series form names: PokeAPI's data (https://github.com/PokeAPI/pokeapi, data/v2/csv),
--     language 1 = ja-Hrkt (the names used in the games, e.g. フシギダネ, ランドフォルム).
--   Mega / Gigantamax / regional forms: built by rule from the species name, in the games' style
--     (メガリザードンX, ロコン（アローラのすがた）, ウーラオス（いちげきのかた・キョダイマックスのすがた）).
--   Costumes: Pokémon GO doesn't name costumes in the game. Labels follow the Japanese costume Pokédex on
--     みんポケ (https://9db.jp/pokemongo/data/8968), e.g. ピカチュウ（魔女帽子）, ナエトル（コウキ）; a few
--     costume Pikachu keep their main-series names (ハードロック・ピカチュウ, マスクド・ピカチュウ, そらをとぶピカチュウ).
--
-- Rows added later (by the crawler or in admin) have no Japanese name and show the English one until
-- they're filled here or in admin.

-- 1. Fetch the PokeAPI files (pg_net). Note the request ids it returns, wait a few seconds, then read
--    net._http_response for those ids in step 2.
select net.http_get('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv', timeout_milliseconds := 60000) as species_names,
       net.http_get('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_form_names.csv', timeout_milliseconds := 60000) as form_names,
       net.http_get('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_forms.csv', timeout_milliseconds := 60000) as forms,
       net.http_get('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon.csv', timeout_milliseconds := 60000) as pokemon;

-- 2. Load them into a private staging schema. Replace :species_names etc. with the request ids from step 1.
create schema if not exists import;
revoke all on schema import from anon, authenticated;
create or replace function import.csv_fields(line text) returns text[] language sql immutable as $$
  select array_agg(case when m[1] like '"%' then replace(substr(m[1], 2, length(m[1]) - 2), '""', '"') else m[1] end order by ord)
  from regexp_matches(line, '("(?:[^"]|"")*"|[^,]*)(?:,|$)', 'g') with ordinality as t(m, ord)
$$;
create table import.species_names as
  select (f[1])::int species, (f[2])::int lang, f[3] as name
  from (select import.csv_fields(l) f from net._http_response r, regexp_split_to_table(r.content, E'\n') with ordinality s(l, n)
        where r.id = :species_names and n > 1 and l <> '') x where f[2] in ('1', '9', '11');
create table import.forms as
  select (f[1])::int id, f[2] identifier, nullif(f[3], '') form_identifier, (f[4])::int pokemon_id
  from (select import.csv_fields(l) f from net._http_response r, regexp_split_to_table(r.content, E'\n') with ordinality s(l, n)
        where r.id = :forms and n > 1 and l <> '') x;
create table import.form_names as
  select (f[1])::int form_id, (f[2])::int lang, nullif(f[3], '') form_name
  from (select import.csv_fields(l) f from net._http_response r, regexp_split_to_table(r.content, E'\n') with ordinality s(l, n)
        where r.id = :form_names and n > 1 and l <> '') x where f[2] in ('1', '9', '11');
create table import.pokemon as
  select (f[1])::int id, f[2] identifier, (f[3])::int species
  from (select import.csv_fields(l) f from net._http_response r, regexp_split_to_table(r.content, E'\n') with ordinality s(l, n)
        where r.id = :pokemon and n > 1 and l <> '') x;

-- 3. Match RepDex form rows to PokeAPI forms: same species, same form code once words like "form",
--    "forme", "cloak", "pattern" and punctuation are dropped (0412_fTRASH ↔ trash, 0479_fFROST ↔ frost).
create or replace function import.norm(s text) returns text language sql immutable as $$
  select regexp_replace(regexp_replace(lower(coalesce(s, '')),
    '(forme|form|cloak|style|mode|pattern|core|plumage|sweet|cream|flower|mask|breed|size)', '', 'g'), '[^a-z0-9]', '', 'g')
$$;
create or replace view import.rd_forms as
  select p.id, p.species, p.form_type, p.alt_name,
         import.norm(regexp_replace(substring(p.id from '_f(.*)$'), '^' || upper(split_part(p.name, ' ', 1)) || '_', '')) code
  from pokemon p where p.id ~ '_f' and p.form_type in ('Form', 'Regular', 'Gender', 'Battle-Only Form');
create or replace view import.api_forms as
  select f.id form_id, p.species, f.form_identifier, import.norm(f.form_identifier) code,
         (select form_name from import.form_names n where n.form_id = f.id and n.lang = 1) ja
  from import.forms f join import.pokemon p on p.id = f.pokemon_id where f.form_identifier is not null;
create or replace view import.form_match as
  select r.*, m.form_id, m.form_identifier, m.ja from import.rd_forms r
  left join lateral (select a.* from import.api_forms a
                     where a.species = r.species and a.code = r.code and a.code <> '' and a.ja is not null limit 1) m on true;

-- 4. Species names, then form names.
update pokemon p set name_ja = s.name from import.species_names s where s.species = p.species and s.lang = 1;

-- Japanese form names that already include the species (ブラックキュレム, フロストロトム) are the whole name.
update pokemon p set alt_name_ja = case when position(p.name_ja in m.ja) > 0 then m.ja else p.name_ja || '（' || m.ja || '）' end
from import.form_match m where m.id = p.id and m.ja is not null and p.species <> 869;

-- Forms PokeAPI spells differently from RepDex (labels from PokeAPI's own entries for these species).
update pokemon p set alt_name_ja = p.name_ja || '（' || o.ja || '）' from (values
  ('0201_fUNOWN_EXCLAMATION_POINT', '！'), ('0201_fUNOWN_QUESTION_MARK', '？'),
  ('0351_REGULAR', 'ポワルンのすがた'), ('0386_REGULAR', 'ノーマルフォルム'),
  ('0421_fSUNNY', 'ポジフォルム'),
  ('0422_fEAST_SEA', 'ひがしのうみ'), ('0422_fWEST_SEA', 'にしのうみ'),
  ('0423_fEAST_SEA', 'ひがしのうみ'), ('0423_fWEST_SEA', 'にしのうみ'),
  ('0555_fGALARIAN_ZEN', 'ガラルのすがた・ダルマモード'),
  ('0718_fFIFTY_PERCENT', '５０％フォルム'), ('0718_fTEN_PERCENT', '１０％フォルム'),
  ('0774_fMETEOR_FORM', 'りゅうせいのすがた'),
  ('0800_fDAWN_WINGS', 'あかつきのつばさ'), ('0800_fDUSK_MANE', 'たそがれのたてがみ'),
  ('0888_REGULAR', 'れきせんのゆうしゃ'), ('0889_REGULAR', 'れきせんのゆうしゃ'),
  ('0888_fCROWNED_SWORD', 'けんのおう'), ('0889_fCROWNED_SHIELD', 'たてのおう'),
  ('0898_fICE_RIDER', 'はくばじょうのすがた'), ('0898_fSHADOW_RIDER', 'こくばじょうのすがた'),
  ('0916_REGULAR', 'オスのすがた'), ('0982_fTHREE', 'みつふしフォルム'), ('0982_fTWO', 'ふたふしフォルム'),
  ('0999_REGULAR', 'とほフォルム'), ('1017_fTEAL', 'みどりのめん'), ('1024_REGULAR', 'ノーマルフォルム')
) o(id, ja) where p.id = o.id;

-- Spinda patterns.
update pokemon set alt_name_ja = name_ja || '（パターン' || lpad(((substring(id from '_f(\d+)$'))::int + 1)::text, 2, '0') || '）'
where species = 327 and id ~ '_f\d+$';

-- Alcremie: cream and sweet (アメざいく), from its English name.
update pokemon set alt_name_ja = name_ja || '（' ||
  case substring(alt_name from '\((\w+ \w+) with')
    when 'Vanilla Cream' then 'ミルキィバニラ' when 'Ruby Cream' then 'ミルキィルビー' when 'Matcha Cream' then 'ミルキィまっちゃ'
    when 'Mint Cream' then 'ミルキィミント' when 'Lemon Cream' then 'ミルキィレモン' when 'Salted Cream' then 'ミルキィソルト'
    when 'Ruby Swirl' then 'ルビーミックス' when 'Caramel Swirl' then 'キャラメルミックス' when 'Rainbow Swirl' then 'トリプルミックス' end
  || '・' ||
  case substring(alt_name from 'with a (\w+) Sweet')
    when 'Strawberry' then 'いちごアメざいく' when 'Berry' then 'ベリーアメざいく' when 'Love' then 'ハートアメざいく'
    when 'Star' then 'スターアメざいく' when 'Clover' then 'よつばアメざいく' when 'Flower' then 'フラワーアメざいく'
    when 'Ribbon' then 'リボンアメざいく' end || '）'
where species = 869 and form_type in ('Form', 'Regular') and alt_name ~ 'with a \w+ Sweet';

-- Mega, Gigantamax, regional and female forms by rule.
update pokemon set alt_name_ja = 'メガ' || name_ja || coalesce(substring(id from '_fMEGA_([XYZ])$'), '') where form_type = 'Mega';
update pokemon set alt_name_ja = name_ja || '（' ||
  case id when '0892_fBREAD_DOUGH_MODE' then 'いちげきのかた・' when '0892_fBREAD_DOUGH_MODE_2' then 'れんげきのかた・' else '' end
  || 'キョダイマックスのすがた）' where form_type = 'Gigantamax';
update pokemon set alt_name_ja = name_ja || '（' ||
  case when id ~ 'ALOLA' then 'アローラのすがた' when id ~ 'GALARIAN' then 'ガラルのすがた'
       when id ~ 'HISUIAN|WHITE_STRIPED' then 'ヒスイのすがた' when id ~ 'PALDEA' then 'パルデアのすがた' end ||
  case id when '0128_fPALDEA_COMBAT' then '・コンバットしゅ' when '0128_fPALDEA_BLAZE' then '・ブレイズしゅ'
          when '0128_fPALDEA_AQUA' then '・ウォーターしゅ' when '0550_fWHITE_STRIPED' then '・しろすじのすがた'
          when '0555_fGALARIAN_STANDARD' then '・ノーマルモード' else '' end || '）'
where form_type = 'Regional';
update pokemon set alt_name_ja = name_ja || '（メスのすがた）' where form_type = 'Gender' and id ~ 'FEMALE$';

-- Default forms with no Japanese form name ("Kyurem (Normal)"): the plain species name.
update pokemon set alt_name_ja = name_ja where form_type <> 'Costume' and alt_name is not null and alt_name_ja is null;

-- 5. Costumes: the theme is the English name without the species ("Witch hat Pikachu" → "Witch hat").
create or replace view import.costumes as
  select id, species, name, name_ja, alt_name,
    trim(regexp_replace(alt_name, '\s*' || regexp_replace(name, '([.*+?()\[\]])', '\\\1', 'g') || '$', '')) theme
  from pokemon where form_type = 'Costume';
create table if not exists import.costume_ja (pattern text primary key, ja text, whole boolean default false, ord int);
-- whole = the label is the full name (no species name in front); ord = lower wins when several patterns match.
insert into import.costume_ja (pattern, ja, whole, ord) values
 ('^10th Anniversary Coin$','10周年コイン',false,1), ('^9th anniversary coin$','9周年コイン',false,1), ('^2017 Go Fest$','GO Fest 2017',false,1),
 ('^Akari''s Kerchief$','ヒスイ頭巾',false,1), ('^Amethyst crown$','紫冠',false,1), ('^Aquamarine crown$','青冠',false,1),
 ('^Malachite crown$','緑冠',false,1), ('^Pyrite crown$','黄冠',false,1), ('^Quartz crown$','ローズ冠',false,1),
 ('^Armored$','アーマードミュウツー',true,1), ('^Ash hat$','オリジナルキャップ',false,1), ('^Astronaut$','宇宙飛行',false,1),
 ('^Baseball cap$','後ろ向き帽子',false,1), ('^Baseball jersey$','ベースボールシャツ',false,1), ('^Batik shirt$','バティック',false,1),
 ('^Blanche$','ブランシェモチーフ',false,1), ('^Candela$','キャンデラモチーフ',false,1), ('^Spark$','スパークモチーフ',false,1),
 ('^Blue shirt \(Citrus\)$','水色Tシャツ',false,1), ('^Green shirt \(Berry\)$','緑Tシャツ',false,1), ('^Purple shirt \(Flower\)$','紫Tシャツ',false,1),
 ('^Bow$','ファッション',false,1), ('^Brendan''s hat$','ホウエン帽子',false,1), ('^May''s bow$','ホウエンリボン',false,1),
 ('^Cake hat$','ケーキ',false,1), ('^Calem''s cap$','カルム帽子',false,1), ('^Serena''s hat$','セレナ帽子',false,1),
 ('^Hilbert''s cap$','トウヤ帽子',false,1), ('^Hilda''s cap$','トウコ帽子',false,1), ('^Ethan''s cap$','ヒビキ帽子',false,1),
 ('^Lyra''s hat$','コトネ帽子',false,1), ('^Red''s cap$','レッド帽子',false,1), ('^Leaf''s hat$','リーフ帽子',false,1),
 ('^Rei''s cap$','ヒスイキャップ',false,1), ('^Nate''s visor$','キョウヘイバイザー',false,1), ('^Rosa''s visor$','メイバイザー',false,1),
 ('^Lucas''s hat$','コウキ',false,1), ('^Dawn''s hat$','ヒカリ',false,1),
 ('^Cap$','キャップ',false,1), ('^Hat$','ハット',false,1), ('^Captain hat$','キャプテン',false,1),
 ('^Cempasúchil$','花飾り',false,1), ('^Charizard hat$','リザードン',false,1), ('^Lucario hat$','ルカリオ',false,1),
 ('^Rayquaza hat$','レックウザ',false,1), ('^Umbreon hat$','ブラッキー',false,1), ('^Cherry blossom$','桜',false,1),
 ('^Clone$','コピー',false,1), ('^Collar$','ファッション',false,1), ('^Cosmog-themed spacesuit$','コスモッグ宇宙服',false,1),
 ('^Cowboy Hat$','カウボーイ',false,1), ('^Studded Jacket$','スタッズ',false,1), ('^Nightcap$','ナイトキャップ',false,1),
 ('^Crown$','王冠',false,1), ('^Day Scarf$','太陽スカーフ',false,1), ('^Night Scarf$','月スカーフ',false,1),
 ('^Detective 2023$','探偵2023',false,1), ('^Detective hat$','探偵',false,1), ('^Drip$','スカーフ',false,1),
 ('^Excavator$','化石博物館',false,1), ('^Explorer$','探検',false,1), ('^Explorer Hat$','サファリ帽',false,1), ('^Safari hat$','サファリ',false,1),
 ('^Fashionable$','ファッション',false,1), ('^Flower crown$','花飾り',false,1),
 ('^Flying$','そらをとぶピカチュウ',true,1), ('^Flying 5th anniversary$','そらをとぶピカチュウ（5周年）',true,1),
 ('^Flying blue/orange$','そらをとぶピカチュウ（オレンジ）',true,1), ('^Flying green$','そらをとぶピカチュウ（緑）',true,1),
 ('^Flying Okinawa$','そらをとぶピカチュウ（沖縄）',true,1), ('^Flying purple$','そらをとぶピカチュウ（紫）',true,1),
 ('^Flying red/black$','そらをとぶピカチュウ（赤）',true,1),
 ('^Formal Googles \(blue\)$','フォーマルゴーグル・青',false,1), ('^Formal Googles \(red\)$','フォーマルゴーグル・赤',false,1),
 ('^Formal Googles \(yellow\)$','フォーマルゴーグル・黄',false,1), ('^Formal Monocle \(blue\)$','フォーマルモノクル・青',false,1),
 ('^Formal Monocle \(red\)$','フォーマルモノクル・赤',false,1), ('^Formal Monocle \(yellow\)$','フォーマルモノクル・黄',false,1),
 ('^Fragment cap$','フラグメント',false,1), ('^Friede''s goggles$','フリードのゴーグル',false,1),
 ('^Halloween (\d{4})$','ハロウィン\1',false,1), ('^Halloween Large Variety \(xl\)$','おおきいサイズ・ハロウィン',false,1),
 ('^Halloween Medium Variety$','ふつうのサイズ・ハロウィン',false,1), ('^Halloween Small Variety \(xxs\)$','ちいさいサイズ・ハロウィン',false,1),
 ('^Halloween Super Variety \(xxl\)$','とくだいサイズ・ハロウィン',false,1), ('^Halloween$','ハロウィン',false,2),
 ('^Hat with Liko''s pin$','リコのピンつき帽子',false,1),
 ('^Holiday (\d{4})$','ホリデー\1',false,1), ('^Holiday attire$','ホリデー2025',false,1), ('^Holiday hat$','ホリデー帽子',false,1), ('^Holiday$','ホリデー',false,2),
 ('^In train-ing$','列車',false,1), ('^Indonesia football jersey$','インドネシアユニフォーム',false,1),
 ('^Kariyushi shirt$','かりゆし',false,1), ('^Kurta$','クルタ',false,1), ('^Saree$','サリー',false,1), ('^Orange hanbok$','オレンジ韓服',false,1),
 ('^Libre$','マスクド・ピカチュウ',true,1), ('^Pop star$','アイドル・ピカチュウ',true,1), ('^Rock star$','ハードロック・ピカチュウ',true,1),
 ('^Ph\.D\.$','ドクター・ピカチュウ',true,1), ('^Marathon visor$','マラソンバイザー',false,1),
 ('^Meloetta hat Galarian$','ポニータ（ガラルのすがた・メロエッタ帽子）',true,1), ('^Meloetta hat$','メロエッタ帽子',false,2),
 ('^Modern Jacket$','ジャケット',false,1), ('^Moon crown$','月冠',false,1), ('^Sun crown$','太陽冠',false,1),
 ('^New Year''s (\d{4})$','新年\1',false,1), ('^New Year''s$','新年',false,2),
 ('^Party hat \(blue and green\)$','パーティハット・青緑',false,1), ('^Party [Hh]at \(purple\)$','パーティハット・紫',false,1),
 ('^Party hat \(red\)$','パーティハット・赤',false,1), ('^Pikachu visor$','ピカチュウバイザー',false,1),
 ('^Pink sunglasses$','ピンクのサングラス',false,1), ('^Poké Ball hat$','モンスターボール帽子',false,1),
 ('^PokéXciting! \(Blue\)$','PokéXciting!・青',false,1), ('^PokéXciting! \(Pink\)$','PokéXciting!・ピンク',false,1),
 ('^PokéXciting! \(Red\)$','PokéXciting!・赤',false,1), ('^PokéXciting! \(Turquoise\)$','PokéXciting!・ターコイズ',false,1),
 ('^Professor Willow.s assistant$','ウィロー博士の助手',false,1), ('^Ribbon$','リボン',false,1),
 ('^Santa [Hh]at$','サンタ',false,1), ('^Summer hat$','サマー',false,1), ('^Winter Beanie$','ニット',false,1), ('^Witch [Hh]at$','魔女帽子',false,1),
 ('^Satchel$','かばん',false,1), ('^Shaymin flowers$','グラシデア',false,1), ('^Shaymin scarf$','シェイミスカーフ',false,1),
 ('^Spring hat$','花帽子',false,1), ('^Straw hat$','麦わら帽子',false,1), ('^Sunglasses$','サングラス',false,1), ('^Swim ring$','浮き輪',false,1),
 ('^TCG cap$','TCG',false,1), ('^Team Instinct cap$','インスティンクトキャップ',false,1), ('^Team Mystic cap$','ミスティックキャップ',false,1),
 ('^Team Valor cap$','ヴァーラーキャップ',false,1), ('^Visor$','バイザー',false,1), ('^Wilderness cape$','マント',false,1), ('^World cap$','ワールドキャップ',false,1),
 ('^WCS (\d{4}) \(London attire\)$','WCS\1・ロンドン',false,1), ('^WCS (\d{4}) \(Game shirt\)$','WCS\1・ゲームシャツ',false,1),
 ('^WCS (\d{4}) \(Diver\)$','WCS\1・ダイバー',false,1), ('^WCS (\d{4}) \(Varsity jacket\)$','WCS\1・スタジャン',false,1), ('^WCS (\d{4})$','WCS\1',false,2)
on conflict (pattern) do update set ja = excluded.ja, whole = excluded.whole, ord = excluded.ord;

update pokemon p set alt_name_ja = case when j.whole then regexp_replace(c.theme, j.pattern, j.ja)
                                        else c.name_ja || '（' || regexp_replace(c.theme, j.pattern, j.ja) || '）' end
from import.costumes c cross join lateral (select * from import.costume_ja j where c.theme ~ j.pattern order by j.ord limit 1) j
where p.id = c.id;

-- 6. Check: rows with a form name but no Japanese one (should be none, or only new rows).
select id, alt_name from pokemon where alt_name is not null and alt_name_ja is null order by id;
