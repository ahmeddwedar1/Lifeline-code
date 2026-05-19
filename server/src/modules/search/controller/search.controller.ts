import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';
import searchService from '../service/search.service';

export class SearchController {
  async searchHospitals(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        q, city, specialization, hasBlood, bloodType,
        lat, lng, radius, page, limit,
      } = req.query;

      const filters = {
        q: q as string | undefined,
        city: city as string | undefined,
        specialization: specialization as string | undefined,
        hasBlood: hasBlood === 'true' ? true : hasBlood === 'false' ? false : undefined,
        bloodType: bloodType as string | undefined,
        lat: lat ? parseFloat(lat as string) : undefined,
        lng: lng ? parseFloat(lng as string) : undefined,
        radius: radius ? parseFloat(radius as string) : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
      };

      const result = await searchService.searchHospitals(filters);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getHospitalDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const hospital = await searchService.getHospitalDetails(req.params.id);
      res.json({ success: true, data: hospital });
    } catch (err) {
      next(err);
    }
  }

  async getRecommendations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { lat, lng, emergencyType, radius } = req.query;

      if (!lat || !lng) {
        res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
        return;
      }

      const result = await searchService.getRecommendations(
        parseFloat(lat as string),
        parseFloat(lng as string),
        emergencyType as string | undefined,
        radius ? parseFloat(radius as string) : undefined,
      );

      res.json({ success: true, data: result, total: result.length });
    } catch (err) {
      next(err);
    }
  }
}

export default new SearchController();
