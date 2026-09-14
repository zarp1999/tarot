$ErrorActionPreference = 'Stop'
$fields = @('general','love','career','advice','caution')
$languages = @('ja','mn')
$orientations = @('upright','reversed')
$header = @('id','language','orientation') + $fields
$sourceFile = Join-Path $PSScriptRoot 'source.en.json'
$sourceDocument = Get-Content -LiteralPath $sourceFile -Raw -Encoding utf8 | ConvertFrom-Json
$sourceCards = @($sourceDocument.tarot_interpretations)
if ($sourceCards.Count -ne 78) { throw 'Expected 78 source cards.' }
$names = @(Get-Content -LiteralPath (Join-Path $PSScriptRoot 'names.json') -Raw -Encoding utf8 | ConvertFrom-Json)
if ($names.Count -ne 78 -or @($names.id | Sort-Object -Unique).Count -ne 78) { throw 'Expected 78 unique localized names.' }
$nameMap = @{}
foreach ($name in $names) {
    if ([string]::IsNullOrWhiteSpace($name.name_ja) -or [string]::IsNullOrWhiteSpace($name.name_mn)) { throw 'Empty localized name.' }
    $nameMap[[int]$name.id] = $name
}
$rows = @()
foreach ($file in @('major.tsv','wands.tsv','cups.tsv','swords.tsv','pentacles.tsv')) {
    $path = Join-Path $PSScriptRoot $file
    foreach ($line in Get-Content -LiteralPath $path -Encoding utf8) {
        if ($line.Split("`t").Count -ne 8) { throw "Expected 8 columns in $file" }
    }
    $rows += @(Import-Csv -LiteralPath $path -Delimiter "`t" -Encoding utf8 -Header $header)
}
if ($rows.Count -ne 312) { throw "Expected 312 editorial rows; found $($rows.Count)" }
$textMap = @{}
foreach ($row in $rows) {
    $key = "$($row.id)/$($row.language)/$($row.orientation)"
    if ($textMap.ContainsKey($key)) { throw "Duplicate: $key" }
    if ([int]$row.id -lt 0 -or [int]$row.id -gt 77) { throw "Invalid id: $key" }
    if ($row.language -notin $languages -or $row.orientation -notin $orientations) { throw "Invalid locale/orientation: $key" }
    foreach ($field in $fields) {
        $value = $row.$field
        if ([string]::IsNullOrWhiteSpace($value) -or $value.Contains([char]0xFFFD)) { throw "Invalid text: $key/$field" }
        if ($row.language -eq 'ja') {
            if ($value -notmatch '[\p{IsHiragana}\p{IsKatakana}\p{IsCJKUnifiedIdeographs}]' -or $value -match '\p{IsCyrillic}') { throw "Wrong script: $key/$field" }
            if ([regex]::Matches($value, '。').Count -lt 2) { throw "Need two sentences: $key/$field" }
        } else {
            if ($value -notmatch '\p{IsCyrillic}' -or $value -match '[\p{IsHiragana}\p{IsKatakana}\p{IsCJKUnifiedIdeographs}]') { throw "Wrong script: $key/$field" }
            if ([regex]::Matches($value, '[.!?]').Count -lt 2) { throw "Need two sentences: $key/$field" }
        }
    }
    $textMap[$key] = $row
}
$offsets = @{ major=0; wands=22; cups=36; swords=50; coins=64 }
$courtRanks = @{ page=11; knight=12; queen=13; king=14 }
$cards = @()
$seen = @{}
foreach ($source in $sourceCards) {
    if (-not $offsets.ContainsKey($source.suit)) { throw "Unknown source suit: $($source.suit)" }
    $rankKey = [string]$source.rank
    $rank = if ($courtRanks.ContainsKey($rankKey)) { $courtRanks[$rankKey] } else { [int]$rankKey }
    $id = if ($source.suit -eq 'major') { $rank } else { $offsets[$source.suit] + $rank - 1 }
    if ($seen.ContainsKey($id) -or -not $nameMap.ContainsKey($id)) { throw "Invalid source mapping: $id" }
    $seen[$id] = $true
    $localized = [ordered]@{}
    foreach ($language in $languages) {
        $entry = [ordered]@{name=$nameMap[$id].("name_$language")}
        foreach ($orientation in $orientations) {
            $key = "$id/$language/$orientation"
            if (-not $textMap.ContainsKey($key)) { throw "Missing $key" }
            $section = [ordered]@{}
            foreach ($field in $fields) { $section[$field] = $textMap[$key].$field }
            $entry[$orientation] = $section
        }
        $localized[$language] = $entry
    }
    $cards += [ordered]@{
        id=$id
        arcana=$(if ($source.suit -eq 'major') {'major'} else {'minor'})
        suit=$(if ($source.suit -eq 'major') {$null} elseif ($source.suit -eq 'coins') {'pentacles'} else {$source.suit})
        rank=$rank
        source_key="$($source.suit)/$($source.rank)"
        source_name=$source.name
        source_reference=[ordered]@{
            dataset_id='corpora-mcelroy'
            original_fields_preserved_in='source.en.json'
            light_en=@($source.meanings.light)
            shadow_en=@($source.meanings.shadow)
        }
        interpretation_basis=[ordered]@{
            upright='Editorial adaptation primarily informed by source.meanings.light; not a literal translation or an original upright label.'
            reversed='Editorial adaptation primarily informed by source.meanings.shadow; not a literal translation or an original reversed label.'
            categories='General, love, career, advice and caution were newly authored for this edition.'
        }
        locales=$localized
    }
}
$cards = @($cards | Sort-Object { $_.id })
$labels = [ordered]@{
    ja=[ordered]@{upright='正位置'; reversed='逆位置'; general='全体の意味'; love='恋愛・人間関係'; career='仕事・学び'; advice='アドバイス'; caution='注意点'}
    mn=[ordered]@{upright='Зөв байрлал'; reversed='Урвуу байрлал'; general='Ерөнхий утга'; love='Хайр ба харилцаа'; career='Ажил ба суралцах'; advice='Зөвлөгөө'; caution='Анхаарах зүйл'}
}
$dataset = [ordered]@{
    schema_version='1.0.0'
    metadata=[ordered]@{
        title='Tarot interpretations: Japanese and Mongolian editorial edition'
        created_date='2026-09-13'
        languages=$languages
        card_count=78
        content_status='AI-authored editorial draft; not reviewed by a native Mongolian speaker or a professional tarot editor.'
        source=[ordered]@{
            id='corpora-mcelroy'
            author='Mark McElroy'
            work='A Guide to Tarot Card Meanings'
            repository='https://github.com/dariusk/corpora'
            dataset_url='https://raw.githubusercontent.com/dariusk/corpora/master/data/divination/tarot_interpretations.json'
            retrieved_date='2026-09-13'
            sha256=(Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256).Hash.ToLowerInvariant()
            license='CC0-1.0 (as declared by Corpora); author also describes the text-only book as public domain.'
            license_notice='SOURCE-NOTICE.md'
        }
        editorial_policy=[ordered]@{
            source_orientation_labels=@('light','shadow')
            mapping='This edition maps constructive aspects primarily to upright and problematic aspects primarily to reversed, as an explicit editorial convention. These are not synonymous in the original source and may differ from other tarot traditions.'
            additions='All localized prose and topic-specific applications are newly authored adaptations, not official translations, direct quotations, or translations of Tarotoo.'
            reading_scope='Single-card reference text; spread position, question and neighboring cards require contextual interpretation.'
            outcomes='Reflective possibilities and practical prompts, not guaranteed predictions or claims about the hidden thoughts of other people.'
            original_fortune_telling='Preserved only in the separate source snapshot; not used as factual predictions in the localized display content.'
        }
        attribution='Interpretive source: Mark McElroy, A Guide to Tarot Card Meanings, via Darius Kazemi and contributors, Corpora. Japanese/Mongolian editorial adaptation created for this project with AI.'
    }
    labels=$labels
    cards=$cards
}
$outputPath = Join-Path $PSScriptRoot 'cards.detailed.ja-mn.json'
$json = ConvertTo-Json -InputObject $dataset -Depth 30
[IO.File]::WriteAllText($outputPath, $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
$roundtrip = Get-Content -LiteralPath $outputPath -Raw -Encoding utf8 | ConvertFrom-Json
if ($roundtrip.cards.Count -ne 78) { throw 'Output card count mismatch.' }
for ($i = 0; $i -lt 78; $i++) {
    $card = $roundtrip.cards[$i]
    if ($card.id -ne $i) { throw "Output ordering error at $i" }
    $original = @($sourceCards | Where-Object { "$($_.suit)/$($_.rank)" -eq $card.source_key })
    if ($original.Count -ne 1 -or $original[0].name -cne $card.source_name) { throw "Source identity mismatch at $i" }
    foreach ($aspect in @('light','shadow')) {
        $expected = ConvertTo-Json -InputObject @($original[0].meanings.$aspect) -Compress
        $actual = ConvertTo-Json -InputObject @($card.source_reference.("${aspect}_en")) -Compress
        if ($expected -cne $actual) { throw "Source text changed at $i/$aspect" }
    }
    foreach ($language in $languages) {
        foreach ($orientation in $orientations) {
            foreach ($field in $fields) {
                $expected = $textMap["$i/$language/$orientation"].$field
                if ($card.locales.$language.$orientation.$field -cne $expected) { throw "Round-trip text mismatch: $i/$language/$orientation/$field" }
            }
        }
    }
}
$duplicateFields = @($rows | ForEach-Object { $_.general } | Group-Object | Where-Object Count -gt 1)
if ($duplicateFields.Count) { throw 'Duplicate general explanations detected.' }
Write-Output 'PASS: 78 cards; 22 major + 56 minor; IDs 0-77; 312 locale/orientation records; 1,560 paragraphs; at least 2 sentences per paragraph; no cross-script contamination; unique general explanations; exact source mapping; unchanged English reference arrays; UTF-8 round-trip verified.'
Write-Output $outputPath
