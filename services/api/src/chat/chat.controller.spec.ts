import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatQueryDto } from './dto/chat-query.dto';

describe('ChatController', () => {
  let controller: ChatController;
  let service: ChatService;

  const mockChatService = {
    generateResponse: jest.fn(),
    streamResponse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('chat', () => {
    it('should generate a chat response', async () => {
      const chatQueryDto: ChatQueryDto = { query: '테스트 질문' };
      const mockUser = { sub: 'user123', organization_id: 'org123' };
      const mockResponse = {
        content: '테스트 응답',
        sources: [],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockChatService.generateResponse.mockResolvedValue(mockResponse);

      const result = await controller.chat(chatQueryDto, { user: mockUser });

      expect(service.generateResponse).toHaveBeenCalledWith(
        chatQueryDto.query,
        mockUser.sub,
        mockUser.organization_id,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('streamChat', () => {
    it('should handle streaming chat response', async () => {
      const chatQueryDto: ChatQueryDto = { query: '스트리밍 테스트' };
      const mockUser = { sub: 'user123', organization_id: 'org123' };
      const mockResponse = {
        writeHead: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      mockChatService.streamResponse.mockResolvedValue(undefined);

      await controller.streamChat(chatQueryDto, { user: mockUser }, mockResponse);

      expect(service.streamResponse).toHaveBeenCalledWith(
        chatQueryDto.query,
        mockUser.sub,
        mockUser.organization_id,
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      );
      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });
    });
  });
}); 