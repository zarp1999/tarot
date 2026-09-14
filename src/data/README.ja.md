# 詳細タロット解説：日本語・モンゴル語

`cards.detailed.ja-mn.json` がWebへ組み込むデータです。外部APIや翻訳APIなしで、収録本文をそのまま表示できます。画像は含みません。

## 収録内容

- 全78枚：大アルカナ22枚、ワンド・カップ・ソード・ペンタクル各14枚。
- 日本語 `ja` とモンゴル語キリル文字 `mn`。
- 各言語で正位置 `upright`、逆位置 `reversed`。
- 各正逆で `general`（全体の意味）、`love`（恋愛・人間関係）、`career`（仕事・学び）、`advice`（アドバイス）、`caution`（注意点）。
- 本文は計1,560段落。各段落は2文以上で、各カード・各言語に20文以上あります。カードごとに個別執筆しており、単なるキーワードの連結ではありません。
- 表示ラベルは `labels.ja` / `labels.mn` に収録。
- 参照した英語の `light` / `shadow` は各カードの `source_reference`、元データ全体は `source.en.json` に保存。

前回の `cards.en-ja-mn.json` とは構造が異なります。今回のトップレベルは配列でなく、`schema_version`、`metadata`、`labels`、`cards` を持つオブジェクトです。既存のWebアプリは変更していません。

## 編集方針と品質状態

Mark McElroyの解釈を収録したCorporaのJSONを土台に、今回のプロジェクト用にAIで日本語・モンゴル語の文章を執筆しました。逐語訳、原著者の公式解説、ネイティブ校閲済みの翻訳ではありません。モンゴル語と日本語の文章は対応するように編集していますが、公開前にモンゴル語話者とタロットに詳しい編集者による確認を推奨します。

原典の **light（建設的な側面）とshadow（課題となる側面）は、正位置と逆位置の同義語ではありません**。本版は前者を主に正位置、後者を主に逆位置へ応用する独自の編集方針を明示しています。一般的な正逆の早見表とは異なる解釈があります。例えば、悪魔の正位置には節度を持って楽しむこと、カップの4の正位置には日常の価値の再発見、ソードの7の正位置には人目のない場面での誠実さを採用しています。一般的なRWS正逆解説をそのまま再現したデータではありません。

恋愛・仕事・具体的な助言・注意点は新たに追加した応用解説です。原典に同じ分類の文章が存在するわけではありません。原文の `fortune_telling` は別ファイルに保存していますが、そこでの断定的な予言は表示用本文に転用していません。

カード名は本版で統一した表記です。モンゴル語の公的・唯一の訳語を主張しません。コートカードは特定の性別や年齢の人物を断定するのではなく、姿勢や役割として本文を編集しています。

## 表示例

静的配信ディレクトリへJSONを置いた場合、次のコードで選んだカードの文章を取得できます。

```js
const response = await fetch('/cards.detailed.ja-mn.json');
if (!response.ok) throw new Error(`カードデータ取得失敗: ${response.status}`);
const dataset = await response.json();

function getReading(id, language = 'ja', reversed = false) {
  if (!['ja', 'mn'].includes(language)) {
    throw new Error('対応言語は ja / mn です');
  }
  if (!Number.isInteger(id) || id < 0 || id > 77) {
    throw new Error('カードIDは0〜77の整数です');
  }
  if (typeof reversed !== 'boolean') {
    throw new Error('reversedには真偽値を指定してください');
  }
  const card = dataset.cards.find(card => card.id === id);
  if (!card) throw new Error('カードが見つかりません');
  const orientation = reversed ? 'reversed' : 'upright';
  const localized = card.locales[language];
  return {
    id: card.id,
    name: localized.name,
    orientation,
    orientationLabel: dataset.labels[language][orientation],
    ...localized[orientation],
  };
}

const japanese = getReading(0, 'ja', false);
const mongolian = getReading(0, 'mn', true);
// japanese.general / japanese.love / japanese.career
// japanese.advice / japanese.caution
// DOMへ表示する場合は textContent を使用できます。
```

IDは0〜21が大アルカナ、22〜35がワンド、36〜49がカップ、50〜63がソード、64〜77がペンタクルです。各スートはエース、2〜10、ペイジ、ナイト、クイーン、キングの順です。元データの `coins` は表示用の `suit` では `pentacles` に正規化し、`source_key` には原典の名前を保持しています。

このデータは1枚ごとの解釈集です。3枚引きなどでは、過去・現在・未来という配置の意味と相談内容を合わせる処理が別途必要です。カードの組み合わせを解釈する文章生成、抽選処理、画像表示はこのデータセットには含めていません。

## 編集・再生成

`major.tsv`、`wands.tsv`、`cups.tsv`、`swords.tsv`、`pentacles.tsv` が編集用原稿です。UTF-8・ヘッダーなしのタブ区切りで、列順は次のとおりです。

`id / language / orientation / general / love / career / advice / caution`

セルの中にタブや改行を入れないでください。カード名は `names.json` で編集します。PowerShell 7で次を実行すると、データを再生成し検証します。

```powershell
./build.ps1
```

検証内容：カードの件数・ID重複・言語と正逆の全組み合わせ・空欄・全段落2文以上・日本語とキリル文字の混入・全体解説の重複・出典のカード対応・英語参照配列の完全保持・保存後の全文一致。

これらは構造と文字の検証で、ネイティブとしての自然さやタロット解釈の正当性を保証するものではありません。

## 出典

利用条件と推奨クレジットは `SOURCE-NOTICE.md` を参照してください。元データは取得時のSHA-256をJSONの `metadata.source.sha256` に記録しています。本版はTarotooの短文を翻訳し直したものではありません。
