import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BillingService, ExportOptions } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'manager')
  async getUsageStats(
    @Request() req,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    console.log('Usage stats request:', { 
      user: req.user, 
      userId, 
      startDate, 
      endDate 
    });

    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      throw new BadRequestException('조직 ID가 필요합니다.');
    }

    const dateRange = startDate && endDate 
      ? { start: startDate, end: endDate }
      : undefined;

    return await this.billingService.getUsageStats(
      organizationId,
      userId,
      dateRange,
    );
  }

  @Post('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  async exportUsageData(
    @Request() req,
    @Res() res: Response,
    @Query('format') format: 'csv' | 'pdf' = 'csv',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeDetails') includeDetails?: string,
    @Query('userId') userId?: string,
  ) {
    const organizationId = req.user.organizationId;
    
    if (!organizationId) {
      throw new BadRequestException('조직 ID가 필요합니다.');
    }

    if (!startDate || !endDate) {
      throw new BadRequestException('시작일과 종료일이 필요합니다.');
    }

    const options: ExportOptions = {
      format,
      dateRange: { start: startDate, end: endDate },
      includeDetails: includeDetails === 'true',
    };

    try {
      const result = await this.billingService.exportUsageData(
        organizationId,
        options,
        userId,
      );

      res.setHeader('Content-Type', result.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}"`,
      );
      
      res.send(result.data);
    } catch (error) {
      throw new BadRequestException('내보내기 중 오류가 발생했습니다.');
    }
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'manager')
  async getUsageSummary(@Request() req) {
    console.log('Usage summary request:', { user: req.user });
    
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      throw new BadRequestException('조직 ID가 필요합니다.');
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 7);

    const [currentStats, lastMonthStats] = await Promise.all([
      this.billingService.getUsageStats(organizationId, undefined, {
        start: `${currentMonth}-01`,
        end: new Date().toISOString().slice(0, 10),
      }),
      this.billingService.getUsageStats(organizationId, undefined, {
        start: `${lastMonth}-01`,
        end: `${currentMonth}-01`,
      }),
    ]);

    const currentMonthData = currentStats.monthlyUsage[0] || {
      tokens: 0,
      cost: 0,
      apiCalls: 0,
    };

    const lastMonthData = lastMonthStats.monthlyUsage[0] || {
      tokens: 0,
      cost: 0,
      apiCalls: 0,
    };

    return {
      currentMonth: {
        tokens: currentMonthData.tokens,
        cost: currentMonthData.cost,
        apiCalls: currentMonthData.apiCalls,
      },
      lastMonth: {
        tokens: lastMonthData.tokens,
        cost: lastMonthData.cost,
        apiCalls: lastMonthData.apiCalls,
      },
      change: {
        tokens: currentMonthData.tokens - lastMonthData.tokens,
        cost: currentMonthData.cost - lastMonthData.cost,
        apiCalls: currentMonthData.apiCalls - lastMonthData.apiCalls,
      },
    };
  }
} 