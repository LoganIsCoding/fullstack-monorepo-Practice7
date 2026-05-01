import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async findUser(id: string): Promise<{ id: string; name: string }> {
    const users: Record<string, { id: string; name: string }> = {
      '1': { id: '1', name: 'Alice' },
    };
    return users[id];
  }
}
