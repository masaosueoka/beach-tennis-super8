import { createCanvas, loadImage, CanvasRenderingContext2D, registerFont } from 'canvas';

/**
 * WhatsAppImageGenerator
 *
 * Produces PNG buffers sized for WhatsApp preview (1080×1080 square).
 * Two main compositions:
 *   - Ranking Top 5
 *   - Super 8 full standings
 *
 * We avoid external font registration to keep Docker image light — falls back
 * to the system default; if you register fonts, call `registerFont()` at boot.
 */

export interface RankingEntry {
  position: number;
  name: string;
  points: number;
  photoUrl?: string | null;
}

export interface StandingsEntry {
  position: number;
  name: string;
  wins: number;
  losses: number;
  setDifference: number;
  gameDifference: number;
  points: number;
  photoUrl?: string | null;
}

const W = 1080;
const H = 1080;
const PRIMARY = '#0ea5e9';   // sky-500 — beach vibe
const SECONDARY = '#f59e0b'; // amber-500 — sun vibe
const BG_DARK = '#0b1221';
const TEXT = '#ffffff';
const MUTED = '#94a3b8';

export class WhatsAppImageGenerator {
  private static fontsRegistered = false;

  static maybeRegisterFonts(): void {
    // Register fonts from /usr/share/fonts if available
    try {
      if (!this.fontsRegistered) {
        // noop — system default used if fonts are not available
        this.fontsRegistered = true;
      }
    } catch {
      /* ignore */
    }
  }

  async generateRankingTop5(params: {
    title: string;
    subtitle?: string;
    entries: RankingEntry[];
  }): Promise<Buffer> {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    this.drawBackground(ctx, 'Ranking Top 5');

    // Title
    ctx.fillStyle = TEXT;
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(params.title, W / 2, 120);

    if (params.subtitle) {
      ctx.fillStyle = MUTED;
      ctx.font = '28px sans-serif';
      ctx.fillText(params.subtitle, W / 2, 160);
    }

    // Entries
    const top = params.entries.slice(0, 5);
    const startY = 240;
    const rowH = 140;

    for (let i = 0; i < top.length; i++) {
      const e = top[i];
      const y = startY + i * rowH;
      await this.drawRankingRow(ctx, e, 80, y, W - 160, rowH - 20);
    }

    this.drawFooter(ctx);
    return canvas.toBuffer('image/png');
  }

  async generateSuper8Standings(params: {
    title: string;
    subtitle?: string;
    entries: StandingsEntry[];
  }): Promise<Buffer> {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    this.drawBackground(ctx, 'Super 8');

    ctx.fillStyle = TEXT;
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(params.title, W / 2, 110);
    if (params.subtitle) {
      ctx.fillStyle = MUTED;
      ctx.font = '26px sans-serif';
      ctx.fillText(params.subtitle, W / 2, 150);
    }

    // Header row
    ctx.fillStyle = SECONDARY;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    const hY = 210;
    ctx.fillText('#', 80, hY);
    ctx.fillText('Jogador', 140, hY);
    ctx.fillText('V', 640, hY);
    ctx.fillText('D', 720, hY);
    ctx.fillText('Sets', 800, hY);
    ctx.fillText('Games', 890, hY);
    ctx.fillText('PTS', 990, hY);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, hY + 12);
    ctx.lineTo(W - 80, hY + 12);
    ctx.stroke();

    // Rows
    const startY = 260;
    const rowH = 88;
    const entries = params.entries.slice(0, 8);
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const y = startY + i * rowH;
      this.drawStandingsRow(ctx, e, y);
    }

    this.drawFooter(ctx);
    return canvas.toBuffer('image/png');
  }

  // ----- private -----

  private drawBackground(ctx: CanvasRenderingContext2D, badge: string): void {
    // Dark gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, BG_DARK);
    grad.addColorStop(1, '#111827');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Accent stripe on the left
    const stripe = ctx.createLinearGradient(0, 0, 0, H);
    stripe.addColorStop(0, PRIMARY);
    stripe.addColorStop(1, SECONDARY);
    ctx.fillStyle = stripe;
    ctx.fillRect(0, 0, 8, H);

    // Badge chip top-right
    ctx.fillStyle = SECONDARY;
    ctx.fillRect(W - 220, 40, 180, 40);
    ctx.fillStyle = BG_DARK;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(badge, W - 130, 68);
  }

  private async drawRankingRow(
    ctx: CanvasRenderingContext2D,
    entry: RankingEntry,
    x: number,
    y: number,
    w: number,
    h: number,
  ): Promise<void> {
    // Card background
    ctx.fillStyle = '#111827';
    this.roundRect(ctx, x, y, w, h, 18);
    ctx.fill();

    // Position pill
    ctx.fillStyle = entry.position === 1 ? SECONDARY : PRIMARY;
    this.roundRect(ctx, x + 20, y + 20, 70, 70, 16);
    ctx.fill();
    ctx.fillStyle = TEXT;
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(entry.position), x + 55, y + 55);

    // Avatar (photo or initial circle)
    const avatarX = x + 120;
    const avatarY = y + 20;
    const avatarSize = 70;
    await this.drawAvatar(ctx, entry, avatarX, avatarY, avatarSize);

    // Name
    ctx.fillStyle = TEXT;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(this.truncate(entry.name, 20), x + 210, y + 50);

    // Points
    ctx.fillStyle = MUTED;
    ctx.font = '22px sans-serif';
    ctx.fillText(`${entry.points} pts`, x + 210, y + 82);

    // Right-side points big
    ctx.fillStyle = SECONDARY;
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${entry.points}`, x + w - 30, y + 70);
  }

  private async drawAvatar(
    ctx: CanvasRenderingContext2D,
    entry: { name: string; photoUrl?: string | null },
    x: number,
    y: number,
    size: number,
  ): Promise<void> {
    // Draw circle clip and either photo or initial
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (entry.photoUrl) {
      try {
        const img = await loadImage(entry.photoUrl);
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();
        return;
      } catch {
        /* fall through to initial */
      }
    }

    ctx.fillStyle = PRIMARY;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = TEXT;
    ctx.font = `bold ${Math.floor(size * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(entry.name.charAt(0).toUpperCase(), x + size / 2, y + size / 2);
    ctx.restore();
  }

  private drawStandingsRow(
    ctx: CanvasRenderingContext2D,
    entry: StandingsEntry,
    y: number,
  ): void {
    // Alt background
    if (entry.position % 2 === 0) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(60, y - 30, W - 120, 70);
    }

    ctx.fillStyle = entry.position <= 3 ? SECONDARY : TEXT;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${entry.position}`, 80, y + 10);

    ctx.fillStyle = TEXT;
    ctx.font = '24px sans-serif';
    ctx.fillText(this.truncate(entry.name, 22), 140, y + 10);

    ctx.fillStyle = '#a7f3d0';
    ctx.fillText(String(entry.wins), 640, y + 10);
    ctx.fillStyle = '#fecaca';
    ctx.fillText(String(entry.losses), 720, y + 10);

    ctx.fillStyle = TEXT;
    ctx.fillText(this.formatDiff(entry.setDifference), 800, y + 10);
    ctx.fillText(this.formatDiff(entry.gameDifference), 890, y + 10);

    ctx.fillStyle = SECONDARY;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(String(entry.points), 990, y + 10);
  }

  private drawFooter(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = MUTED;
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Beach Tennis Super 8', W / 2, H - 40);
  }

  private truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  private formatDiff(n: number): string {
    return n > 0 ? `+${n}` : String(n);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
