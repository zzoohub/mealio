const PostHog = jest.fn().mockImplementation(() => ({
  capture: jest.fn(),
  identify: jest.fn(),
  alias: jest.fn(),
  reset: jest.fn(),
  flush: jest.fn(),
}));

export default PostHog;
