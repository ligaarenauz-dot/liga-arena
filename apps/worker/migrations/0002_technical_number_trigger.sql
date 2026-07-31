-- Liga Arena technical number trigger
-- Source: local SQLite database
-- Technical number assignment must remain automatic.

CREATE TRIGGER IF NOT EXISTS trg_assign_team_technical_number

  AFTER INSERT ON teams

  WHEN NEW.technical_number = ''

  BEGIN
    INSERT INTO team_number_sequences (
      season,
      game,
      last_number
    )
    VALUES (
      NEW.season,
      NEW.game,
      1
    )

    ON CONFLICT(season, game)
    DO UPDATE SET
      last_number =
        team_number_sequences.last_number + 1;

    UPDATE teams
    SET technical_number =
      CASE
        WHEN NEW.game = 'PUBG'
          THEN 'P'
        ELSE 'M'
      END
      || '-'
      || NEW.season
      || '-'
      || printf(
        '%04d',
        (
          SELECT last_number
          FROM team_number_sequences
          WHERE
            season = NEW.season
            AND game = NEW.game
        )
      )

    WHERE id = NEW.id;
  END;
