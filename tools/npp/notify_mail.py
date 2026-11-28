"""Gửi email bằng hộp thư hệ thống mmh.notify (Gmail SMTP + mật khẩu ứng dụng) — 28/11/2026, người dùng yêu cầu
(đỡ quá tải hạn mức email của mmh.product). Biến môi trường: NOTIFY_SMTP_USER (địa chỉ) · NOTIFY_SMTP_PASS (mật khẩu ứng dụng,
GitHub secret — KHÔNG ghi vào repo). Chưa có ⇒ ready() = False ⇒ KHÔNG gửi (v1.3: email thầu chỉ gửi bằng mmh.notify).
"""
import os, smtplib, mimetypes, time
from email.message import EmailMessage
from email.utils import make_msgid, formataddr

USER = (os.environ.get('NOTIFY_SMTP_USER') or '').strip()
PASS = (os.environ.get('NOTIFY_SMTP_PASS') or '').replace(' ', '').strip()
NAME = os.environ.get('NOTIFY_FROM_NAME') or 'Hệ thống Theo dõi thầu MMH'


def ready():
    return bool(USER and PASS)


def send(to, cc, subject, html, text='Vui lòng xem email ở chế độ HTML.', inline=(), attach=(), reply_id=''):
    """to / cc: danh sách email · inline: [(cid, đường dẫn ảnh)] · attach: [đường dẫn] · reply_id: Message-ID thư gốc (trả lời cùng luồng).
    Trả Message-ID của thư vừa gửi."""
    m = EmailMessage()
    m['From'] = formataddr((NAME, USER))
    m['To'] = ', '.join(to)
    if cc: m['Cc'] = ', '.join(cc)
    m['Subject'] = subject
    mid = make_msgid(domain=USER.split('@')[-1] or 'gmail.com')
    m['Message-ID'] = mid
    if reply_id:
        m['In-Reply-To'] = reply_id
        m['References'] = reply_id
    m.set_content(text)
    m.add_alternative(html, subtype='html')
    hp = m.get_payload()[-1]
    for cid, path in inline:
        mt = (mimetypes.guess_type(path)[0] or 'image/jpeg').split('/')
        hp.add_related(open(path, 'rb').read(), maintype=mt[0], subtype=mt[1], cid='<%s>' % cid, filename=os.path.basename(path))
    for path in attach:
        mt = (mimetypes.guess_type(path)[0] or 'application/octet-stream').split('/')
        m.add_attachment(open(path, 'rb').read(), maintype=mt[0], subtype=mt[1], filename=os.path.basename(path))
    err = None
    for i in range(3):
        try:
            with smtplib.SMTP('smtp.gmail.com', 587, timeout=90) as s:
                s.starttls(); s.login(USER, PASS)
                s.send_message(m, from_addr=USER, to_addrs=list(to) + list(cc or []))
            return mid
        except smtplib.SMTPAuthenticationError:
            raise
        except Exception as e:
            err = e; time.sleep(10 * (i + 1))
    raise err
