import { PaymentRepository } from '../repositories/misc.repositories';
import { eventBus } from '../database/event-bus';

/**
 * Abstract payment provider. Swap with Stripe, MercadoPago, PagSeguro, Pix etc.
 *
 * The Payment model is populated when the organizer (or a webhook) confirms
 * payment. Until then, the payment stays PENDING. The organizer can also
 * manually mark a payment as PAID (cash at the tournament).
 */
export interface PaymentProvider {
  readonly name: string;
  createCharge(params: {
    amount: number;
    payerName: string;
    payerEmail?: string;
    referenceId: string;
  }): Promise<{ providerRef: string; checkoutUrl?: string }>;
}

/**
 * Default "manual" provider — used when organizers accept cash/Pix out of band.
 * Creates a dummy reference and leaves the payment PENDING until someone flips it.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = 'manual';
  async createCharge(params: { referenceId: string }) {
    return { providerRef: `manual:${params.referenceId}:${Date.now()}` };
  }
}

export class PaymentService {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly provider: PaymentProvider = new ManualPaymentProvider(),
  ) {}

  async createForRegistration(params: {
    playerId: string;
    tournamentId: string;
    amount: number;
    payerName: string;
    payerEmail?: string;
  }) {
    const existing = await this.paymentRepo.findForRegistration(
      params.playerId,
      params.tournamentId,
    );
    if (existing) return existing;

    const charge = await this.provider.createCharge({
      amount: params.amount,
      payerName: params.payerName,
      payerEmail: params.payerEmail,
      referenceId: `${params.tournamentId}:${params.playerId}`,
    });

    const payment = await this.paymentRepo.create({
      amount: params.amount,
      provider: this.provider.name,
      providerRef: charge.providerRef,
      status: 'PENDING',
      player: { connect: { id: params.playerId } },
      tournament: { connect: { id: params.tournamentId } },
    });

    eventBus.emit({ type: 'payment.updated', paymentId: payment.id });
    return payment;
  }

  async markPaid(id: string, providerRef?: string) {
    const p = await this.paymentRepo.updateStatus(id, 'PAID', {
      providerRef,
      paidAt: new Date(),
    });
    eventBus.emit({ type: 'payment.updated', paymentId: p.id });
    return p;
  }

  async cancel(id: string) {
    const p = await this.paymentRepo.updateStatus(id, 'CANCELED');
    eventBus.emit({ type: 'payment.updated', paymentId: p.id });
    return p;
  }
}
