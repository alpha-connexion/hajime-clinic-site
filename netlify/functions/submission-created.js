// Netlify event function: fires on every verified (non-spam) form submission.
// Sends an application-confirmation email to the candidate via Resend.
// No-ops safely until RESEND_API_KEY is configured in the Netlify env,
// and ignores every form except "job-application".
exports.handler = async (event) => {
  const ok = (msg) => ({ statusCode: 200, body: msg });
  try {
    const { payload } = JSON.parse(event.body || "{}");
    if (!payload || payload.form_name !== "job-application") return ok("skip: not job-application");

    const data = payload.data || {};
    const email = (data.email || "").trim();
    if (!email) return ok("skip: no candidate email");

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return ok("skip: RESEND_API_KEY not configured");

    const from = process.env.CONFIRM_FROM || "はじめクリニック 採用担当 <noreply@n-clinics.jp>";
    const name = (data.name || "").trim();
    const position = (data.position || "求人").trim();
    const positionUrl = (data["position-url"] || "https://hajime.n-clinics.jp/recruit").trim();

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
