import { prisma } from '../database/prisma';
import { Prisma } from '@prisma/client';

export class CategoryRepository {
  async list() {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  }
  async findById(id: string) {
    return prisma.category.findUnique({ where: { id } });
  }
  async create(data: Prisma.CategoryCreateInput) {
    return prisma.category.create({ data });
  }
  async update(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({ where: { id }, data });
  }
  async delete(id: string) {
    return prisma.category.delete({ where: { id } });
  }
}

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }
  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }
}

export class SponsorRepository {
  async listActive() {
    return prisma.sponsor.findMany({
      where: { active: true },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });
  }
  async listAll() {
    return prisma.sponsor.findMany({ orderBy: [{ priority: 'desc' }, { name: 'asc' }] });
  }
  async create(data: Prisma.SponsorCreateInput) {
    return prisma.sponsor.create({ data });
  }
  async update(id: string, data: Prisma.SponsorUpdateInput) {
    return prisma.sponsor.update({ where: { id }, data });
  }
  async delete(id: string) {
    return prisma.sponsor.delete({ where: { id } });
  }
}

export class PaymentRepository {
  async create(data: Prisma.PaymentCreateInput) {
    return prisma.payment.create({ data });
  }
  async findById(id: string) {
    return prisma.payment.findUnique({ where: { id } });
  }
  async findForRegistration(playerId: string, tournamentId: string) {
    return prisma.payment.findUnique({
      where: { playerId_tournamentId: { playerId, tournamentId } },
    });
  }
  async updateStatus(
    id: string,
    status: 'PENDING' | 'PAID' | 'CANCELED' | 'REFUNDED',
    extra: { providerRef?: string; provider?: string; paidAt?: Date } = {},
  ) {
    return prisma.payment.update({
      where: { id },
      data: { status, ...extra },
    });
  }
  async listByTournament(tournamentId: string) {
    return prisma.payment.findMany({
      where: { tournamentId },
      include: { player: true },
    });
  }
}

export class NotificationRepository {
  async create(data: Prisma.NotificationCreateInput) {
    return prisma.notification.create({ data });
  }
  async listForUser(userId: string, limit = 50) {
    return prisma.notification.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
  async markRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}
