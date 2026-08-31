// Netlify event function: fires on every verified (non-spam) form submission.
// For "job-application" submissions it sends, via Resend:
//   1) a confirmation email to the candidate (when they provided an email)
//   2) a staff notification to the clinic inbox with a UNIQUE subject per
//      submission (【採用応募】name様（position）) so Gmail never threads
//      separate applications together. Reply-To is the candidate.
// No-ops safely until RESEND_API_KEY is configured in the Netlify env.
exports.handler = async (event) => {
  const ok = (msg) => ({ statusCode: 200, body: msg });
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONFIRM_FROM || "はじめクリニック 採用担当 <noreply@n-clinics.jp>";
  const CLINIC_INBOX = "hajime.a.cl@gmail.com";

  const send = (msg) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });

  try {
    const { payload } = JSON.parse(event.body || "{}");
    if (!payload || payload.form_name !== "job-application") return ok("skip: not job-application");
    if (!apiKey) return ok("skip: RESEND_API_KEY not configured");

    const data = payload.data || {};
    const email = (data.email || "").trim();
    const name = (data.name || "").trim();
    const kana = (data.kana || "").trim();
    const phone = (data.phone || "").trim();
    const background = (data.background || "").trim();
    const position = (data.position || "求人").trim();
    const positionUrl = (data["position-url"] || "https://hajime.n-clinics.jp/recruit").trim();

    // --- 1) staff notification (unique subject; Reply-To = candidate) ---
    const staffText = `ウェブサイトから求人応募がありました。

■ 応募職種：${position}
　${positionUrl}

■ お名前：${name || "（未入力）"}${kana ? `（${kana}）` : ""}
■ メール：${email || "（未入力）"}
■ 電話　：${phone || "（未入力）"}

■ ご経歴・自己PR・志望動機：
${background || "（未入力）"}

■ 添付書類（履歴書・職務経歴書）：
Netlifyの管理画面からダウンロードできます（添付があった場合）。
https://app.netlify.com/projects/hajime-clinic/forms

※ このメールに返信すると、応募者${email ? "のメールアドレス宛に届きます" : "には届きません（メール未入力のため、お電話でご連絡ください）"}。
※ 3営業日以内のご連絡をお願いします。`;

    const staffMsg = {
      from,
      to: [CLINIC_INBOX],
      subject: `【採用応募】${name || "お名前未入力"}様（${position}）`,
      text: staffText,
    };
    if (email) staffMsg.reply_to = email;
    const staffRes = await send(staffMsg);
    if (!staffRes.ok) console.error("Resend staff-mail error:", staffRes.status, await staffRes.text());

    // --- 2) candidate confirmation (only when they gave an email) ---
    if (!email) return ok("staff notified; no candidate email");

    const text = `${name ? name + " 様" : "ご応募者さま"}

この度は、はじめクリニック（一般社団法人 佳純会）の求人
「${position}」にご応募いただき、誠にありがとうございます。

ご応募内容を確認のうえ、3営業日以内に担当者よりご連絡いたします。
今しばらくお待ちください。

▼ ご応募いただいた求人（あとで見返す場合はこちら）
${position}
${positionUrl}

※ 3営業日を過ぎても連絡がない場合は、お手数ですが
　 06-7659-0299 までお電話いただけますと幸いです。

──────────────────────
はじめクリニック（一般社団法人 佳純会）
〒561-0881 大阪府豊中市中桜塚5丁目3番45号
TEL: 06-7659-0299
https://hajime.n-clinics.jp/
──────────────────────
※ このメールは自動送信です。ご返信いただいた内容は
　 採用担当が確認いたします。`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        reply_to: "hajime.a.cl@gmail.com",
        subject: "【はじめクリニック】ご応募ありがとうございます",
        text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend error:", res.status, detail);
      return ok("resend error logged");
    }
    return ok("confirmation sent");
  } catch (e) {
    console.error("submission-created error:", e);
    return ok("error logged");
  }
};
