import { Controller, Post, Get, Body, UseGuards, Request, Res, Sse } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatQueryDto } from './dto/chat-query.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('stream')
  async streamChat(
    @Body() chatQueryDto: ChatQueryDto,
    @Request() req,
    @Res() res: Response,
  ) {
    console.log('=== CHAT STREAM ENDPOINT CALLED ===');
    console.log('Request body:', chatQueryDto);
    console.log('User:', req.user);
    
    const { query } = chatQueryDto;
    // 개발 모드에서는 기본값 사용
    const userId = req.user?.sub || '00000000-0000-0000-0000-000000000001';
    const organizationId = req.user?.organization_id || 'dev-org';

    console.log('Processed user info:', { userId, organizationId });

    // SSE 헤더 설정
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no', // Nginx 버퍼링 비활성화
    });

    console.log('SSE headers set, starting stream response');

    try {
      await this.chatService.streamResponse(
        query,
        userId,
        organizationId,
        (chunk: string) => {
          console.log('Sending chunk:', chunk);
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        },
        (sources: any[]) => {
          console.log('Sending sources:', sources.length);
          res.write(`data: ${JSON.stringify({ sources })}\n\n`);
        },
        (error: string) => {
          console.error('Stream error:', error);
          res.write(`data: ${JSON.stringify({ error })}\n\n`);
        }
      );

      console.log('Stream completed, sending [DONE]');
      res.write('data: [DONE]\n\n');
    } catch (error) {
      console.error('Chat stream error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    } finally {
      console.log('Ending response');
      res.end();
    }
  }

  @Post()
  async chat(
    @Body() chatQueryDto: ChatQueryDto,
    @Request() req,
  ) {
    const { query } = chatQueryDto;
    // 개발 모드에서는 기본값 사용
    const userId = req.user?.sub || '00000000-0000-0000-0000-000000000001';
    const organizationId = req.user?.organization_id || 'dev-org';

    return this.chatService.generateResponse(query, userId, organizationId);
  }

  @Get('test')
  async test() {
    console.log('=== CHAT TEST ENDPOINT CALLED ===');
    return { message: 'Chat endpoint is working' };
  }
} 