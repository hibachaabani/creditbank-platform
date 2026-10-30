import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { MlScoringService } from './ml-scoring.service';

@Module({
  imports: [ConfigModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, MlScoringService],
  exports: [MlScoringService],
})
export class AnalysisModule {}
