# .githooks — commit öncesi sır taraması

Amaç: API anahtarı, özel anahtar, service-role JWT, `.env` dosyası gibi sırların commit'e girmesini
**commit anında** durdurmak. Çıktıda sır değeri asla gösterilmez; yalnız kural kimliği + `dosya:satır`.

## Etkinleştirme (klon başına bir kez)

```bash
git config core.hooksPath .githooks
```

`core.hooksPath` yerel git ayarıdır, repoya girmez; yeni klonda/yeni makinede tekrar çalıştır.
`.git/hooks/` içindeki eski kancalar `core.hooksPath` ayarlanınca çalışmaz — bu repoda ihtiyaç
duyulan kancalar bu klasöre taşındı.

## Ne tarar

1. **gitleaks kuruluysa** onu kullanır (`brew install gitleaks` — önerilen, daha geniş kural seti).
   `.gitleaks.toml` varsayılan kurallara + kilit dosyası muafiyetine uzanır.
2. **Kurulu değilse** `secret-scan.mjs` (bağımlılıksız Node, ek kurulum yok) stage'lenen EKLEMELERİ tarar:
   AWS/GitHub/Slack/Stripe/OpenAI/Anthropic/SendGrid/Resend anahtarları, PEM özel anahtar bloğu,
   Supabase `service_role` JWT'si, Lemon Squeezy API anahtarı biçimi, parolalı veritabanı URL'i,
   `AIza…` Google anahtarı (Firebase bağlamında yalnız uyarı), `.env*` / servis hesabı JSON'u / `*.pem`
   dosyalarının stage'lenmesi. Genel "secret=…" atamaları yalnız **uyarı** verir, engellemez.

Supabase **anon** anahtarı herkese açıktır; engellenmez.

## Yanlış pozitif / muafiyet

- Tek satır: satıra `secret-scan:allow` (ya da `gitleaks:allow`) yorumu ekle.
- Dosya/kural bazlı: `.githooks/secret-scan.allow` (her satır `<yol-regex> [kural-kimliği]`, gerekçe yorumuyla).
- `git commit --no-verify` yalnız gerekçeli ve istisnai; ajanlar kullanmaz.
- Gerçek bir sır yakalandıysa: dosyadan çıkar **ve sırrı döndür (rotate)** — git geçmişine girmişse silmek yetmez.

## Geçmiş taraması (tek seferlik / periyodik denetim)

```bash
node .githooks/secret-scan.mjs --history     # tüm ref'ler; çıktı: kural + dosya:satır, değer yok
node .githooks/secret-scan.mjs --self-test   # kural doğrulaması (sahte, çalışma anında üretilen değerlerle)
# gitleaks kuruluysa ikinci görüş:
gitleaks git --redact --no-banner
```
