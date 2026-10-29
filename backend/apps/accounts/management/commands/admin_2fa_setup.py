"""Administrator uchun TOTP qurilmasini ulaydi (FT-10.4).

    python manage.py admin_2fa_setup <login>

Terminalda QR-kod chiqadi — uni Google Authenticator / Microsoft Authenticator / Aegis
ilovasida skanerlang. Keyin admin panelga kirishda parol bilan birga 6 xonali kod so'raladi.
"""
import qrcode
from django.core.management.base import BaseCommand, CommandError
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts.models import User


class Command(BaseCommand):
    help = "Admin uchun ikki bosqichli kirish (TOTP) qurilmasini yaratadi"

    def add_arguments(self, parser):
        parser.add_argument("login")
        parser.add_argument("--reset", action="store_true", help="Eski qurilmalarni o'chirib, yangisini yaratish")

    def handle(self, *args, **opts):
        user = User.objects.filter(username=opts["login"]).first()
        if not user or not user.is_staff:
            raise CommandError("Bunday admin (is_staff) foydalanuvchi topilmadi")
        if opts["reset"]:
            TOTPDevice.objects.filter(user=user).delete()
        elif TOTPDevice.objects.filter(user=user, confirmed=True).exists():
            raise CommandError("Qurilma allaqachon ulangan. Qayta ulash uchun --reset")
        device = TOTPDevice.objects.create(user=user, name="Asosiy", confirmed=True)
        qr = qrcode.QRCode(border=1)
        qr.add_data(device.config_url)
        qr.print_ascii(out=self.stdout, invert=True)
        self.stdout.write(f"\nYoki qo'lda kiriting: {device.config_url}\n")
        self.stdout.write(self.style.SUCCESS("Tayyor. ADMIN_2FA=true bo'lsa admin panelga kirishda kod so'raladi."))
